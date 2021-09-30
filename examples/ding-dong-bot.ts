#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * Wechaty - Conversational RPA SDK for Chatbot Makers.
 *  - https://github.com/wechaty/wechaty
 */
import {
  Contact,
  // Message,
  ScanStatus,
  Wechaty,
  log,
} from "wechaty";
import schedule from "node-schedule";
import qrcodeTerminal from "qrcode-terminal";

// https://stackoverflow.com/a/42817956/1123955
// https://github.com/motdotla/dotenv/issues/89#issuecomment-587753552
import "dotenv/config.js";

import fetch from "node-fetch";

function onLogout(user: Contact) {
  log.info("StarterBot", "%s logout", user);
}

function onScan(qrcode: string, status: ScanStatus) {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    const qrcodeImageUrl = [
      "https://wechaty.js.org/qrcode/",
      encodeURIComponent(qrcode),
    ].join("");
    log.info(
      "StarterBot",
      "onScan: %s(%s) - %s",
      ScanStatus[status],
      status,
      qrcodeImageUrl
    );

    qrcodeTerminal.generate(qrcode, { small: true }); // show qrcode on console
  } else {
    log.info("StarterBot", "onScan: %s(%s)", ScanStatus[status], status);
  }
}

function onLogin(user: Contact) {
  log.info("StarterBot", "%s login", user);
}

const bot = new Wechaty({
  name: "ding-dong-bot",
});

// 接口
// const url = "http://localhost:300/api/spider";
const url = "https://www.xiaxiazheng.cn/api/spider";
const getRoomsList = async () => {
  const res = await fetch(`${url}/getRoomsList`);
  return await res.json();
}
const getMorningJobMsg = async () => {
  const res = await fetch(`${url}/getMorningJobMsg`);
  return await res.json();
};
const getAfternoonJobMsg = async () => {
  const res = await fetch(`${url}/getAfternoonJobMsg`);
  return await res.json();
};

// 要执行的任务
const morningJob = async (list: any) => {
  const msg: any = await getMorningJobMsg();
  list.forEach((item: any) => {
    const { room, roomName } = item;
    room.say(msg[roomName]);
  });
};
const afternoonJob = async (list: any) => {
  const msg: any = await getAfternoonJobMsg();
  list.forEach((item: any) => {
    const { room, roomName } = item;
    room.say(msg[roomName]);
  });
};

// 找到房间，没找到过五秒继续找，找到执行定时任务
const getRoom: any = async (list: any[]) => {
  const reg = new RegExp(list.map((item) => item.roomName).join("|"));
  console.log('查找 room 中...')
  const rooms = await bot.Room.findAll({ topic: reg });
  if (rooms && rooms.length === list.length) {
    console.log("查找 room 成功。");

    // 将 room 装到数组中
    list = list.map(item => {
      const room = rooms.find((room: any) => room?.payload?.topic.indexOf(item.roomName) !== -1);
      return {
        ...item,
        room
      }
    })

    console.log('执行定时任务1');
    const rule1 = new schedule.RecurrenceRule();
    rule1.hour = [9];
    schedule.scheduleJob(rule1, () => morningJob(list));

    console.log('执行定时任务2');
    const rule2 = new schedule.RecurrenceRule();
    rule2.hour = [15];
    schedule.scheduleJob(rule2, () => afternoonJob(list));

  } else {
    console.log("查找 room 失败，继续查找");
    setTimeout(() => {
      getRoom(list);
    }, 5000);
  }
};

bot.on("scan", onScan);
bot.on("login", onLogin);
bot.on("logout", onLogout);
bot.on("ready", async () => {
  // 获取房间配置：
  console.log('获取配置列表...');
  const list = await getRoomsList();
  console.log('list', list);
  console.log('获取房间信息...');
  getRoom(list);
});

bot
  .start()
  .then(async () => {
    log.info("StarterBot", "Starter Bot Started.");

    return "";
  })
  .catch((e) => log.error("StarterBot", e));
