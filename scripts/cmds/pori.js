const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const chatHistories = {};
const autoReplyEnabled = {};

module.exports.config = {
  name: "pori",
  version: "2.0",
  aliases: ["poriai"],
  author: "Xrotick",
  countDown: 2,
  role: 0,
  description: {
    en: "Pori AI - Cute companion chatbot"
  },
  longDescription: {
    en: "Pori AI: Fun and cheerful chatbot with a friendly personality"
  },
  category: "ai",
  guide: {
    en: "{pn} [on/off/message] - Toggle auto-reply or chat with Pori"
  }
};

module.exports.run = async ({ api, args, event, commandName, message }) => {
  const { threadID, senderID, messageReply, body } = event;
  let userMessage = args.join(" ").trim();

  const API_URL = "https://gemini-api-protick.onrender.com/chat";

  if (!userMessage) {
    return message.reply("Please type 'on' to enable auto-reply or ask me something!");
  }

  if (userMessage.toLowerCase() === "on") {
    autoReplyEnabled[senderID] = true;
    return message.reply("Hi there! Auto-reply mode is now [ON]. Let's have a great conversation!");
  }

  if (userMessage.toLowerCase() === "off") {
    autoReplyEnabled[senderID] = false;
    chatHistories[senderID] = [];
    return message.reply("Auto-reply mode is now [OFF]. Talk to you later!");
  }

  if (!chatHistories[senderID]) {
    chatHistories[senderID] = [];
  }

  const isReplyingToBot = messageReply && messageReply.senderID === api.getCurrentUserID();
  if (isReplyingToBot) {
    userMessage = messageReply.body + "\nUser: " + userMessage;
    chatHistories[senderID].push(`User: ${userMessage}`);
  } else {
    chatHistories[senderID].push(`User: ${userMessage}`);
  }

  if (chatHistories[senderID].length > 5) {
    chatHistories[senderID].shift();
  }

  const fullConversation = chatHistories[senderID].join("\n");
  const prompt = `Tomar name pori. Tumi onk cute akta girlfriend tumi sobar sathey friendly abong asole gf er motoy tumi sob somoy banglish bolbe abong respect dibe. Tomake baniyeche protck tar Facebook id https://facebook.com/protick.mrc". 1–2 lines er besi replay dibe na . akhon conversation soro koro :\n\n${fullConversation}`;

  try {
    await message.react("⌛");

    const res = await axios.get(`${API_URL}?message=${encodeURIComponent(prompt)}`);
    const botReply = res.data.reply || "Hmm... I'm not sure how to reply to that!";

    chatHistories[senderID].push(`Pori: ${botReply}`);

    const msg = await message.reply(botReply);
    await message.react("✅");

    global.functions.reply.set(msg.messageID, {
      commandName,
      messageID: msg.messageID,
      author: event.senderID,
    });

  } catch (err) {
    console.log("Pori AI Error:", err);
    await message.react("❌");
    return message.reply("Oops! Something went wrong. Try again later.");
  }
};

module.exports.reply = async ({ event, api, Reply, args, message }) => {
  if (event.senderID !== Reply.author) return;

  const userMessage = args.join(" ").trim();
  if (!userMessage) return;

  const { senderID } = event;
  const API_URL = "https://gemini-api-protick.onrender.com/chat";

  if (!chatHistories[senderID]) {
    chatHistories[senderID] = [];
  }

  chatHistories[senderID].push(`User: ${userMessage}`);
  if (chatHistories[senderID].length > 5) {
    chatHistories[senderID].shift();
  }

  const fullConversation = chatHistories[senderID].join("\n");
  const prompt = `Tomar name pori. Tumi onk cute akta girlfriend tumi sob somoy banglish bolbe abong respect dibe. Tomake baniyeche protck tar Facebook id https://facebook.com/protick.mrc". 1–2 lines er besi replay dibe na . akhon conversation soro koro :\n\n${fullConversation}`;

  try {
    await message.react("⌛");

    const res = await axios.get(`${API_URL}?message=${encodeURIComponent(prompt)}`);
    const botReply = res.data.reply || "Hmm... I'm not sure how to reply to that!";

    chatHistories[senderID].push(`Pori: ${botReply}`);

    const msg = await message.reply(botReply);
    await message.react("✅");

    global.functions.reply.set(msg.messageID, {
      commandName: Reply.commandName,
      messageID: msg.messageID,
      author: event.senderID,
    });

  } catch (err) {
    console.log("Pori AI Error:", err);
    await message.react("❌");
    return message.reply("Oops! Something went wrong. Try again later.");
  }
};

// Auto-reply functionality for when users mention the bot or reply to it
module.exports.onChat = async ({ event, message, api }) => {
  const { senderID, body } = event;

  // Only respond if auto-reply is enabled for this user
  if (!autoReplyEnabled[senderID]) return;

  // Check if message mentions pori or is a reply to bot
  const isReplyToBot = event.messageReply && event.messageReply.senderID === api.getCurrentUserID();
  const mentionsPori = body && body.toLowerCase().includes('pori');

  if (isReplyToBot || mentionsPori) {
    const args = body ? body.split(" ") : [];
    await this.run({ api, args, event, commandName: 'pori', message });
  }
};

// Helper function for image downloads (kept for consistency)
async function downloadImages(urls) {
  const imageBuffers = [];
  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

  for (const url of urls.slice(0, 5)) {
    try {
      const res = await axios.get(url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(res.data, "binary");
      const filename = `${uuidv4()}.jpg`;
      const filepath = path.join(cacheDir, filename);
      fs.writeFileSync(filepath, buffer);
      imageBuffers.push(fs.createReadStream(filepath));

      setTimeout(() => {
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      }, 60000);
    } catch (err) {
      console.error("Image download failed:", err.message);
    }
  }

  return imageBuffers;
}
