import crypto from 'crypto';

const CONFIG = {
  COINS: ['shib', 'pepe'],
  BUY_DIP: 1,
  TP: 2,
  TRADE_IDR: 100000
};

function sign(params, secret) {
  const h = crypto.createHmac('sha512', secret);
  h.update(new URLSearchParams(params).toString());
  return h.digest('hex');
}

async function privateReq(key, secret, method, extra = {}) {
  const data = { method, timestamp: Date.now(), recvWindow: 10000, ...extra };
  data.signature = sign(data, secret);
  const res = await fetch('https://indodax.com/tapi', {
    method: 'POST',
    headers: { Key: key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data)
  });
  return res.json();
}

async function getTicker(coin) {
  const r = await fetch(`https://indodax.com/api/ticker/${coin}_idr`);
  return (await r.json()).ticker;
}

export default async function handler(req, res) {
  const KEY = process.env.INDODAX_API_KEY;
  const SECRET = process.env.INDODAX_SECRET;

  if (!KEY) return res.status(200).json({ status: 'ENV belum diset', info: 'Set di Vercel Settings' });

  const logs = [];
  try {
    for (const coin of CONFIG.COINS) {
      const t = await getTicker(coin);
      const last = parseFloat(t.last);
      const high = parseFloat(t.high);
      const drop = ((high - last) / high) * 100;
      logs.push(`${coin.toUpperCase()}: Rp ${last} | Drop ${drop.toFixed(2)}%`);

      if (drop >= CONFIG.BUY_DIP) {
        const buy = await privateReq(KEY, SECRET, 'trade', {
          pair: `${coin}_idr`,
          type: 'buy',
          price: last,
          idr: CONFIG.TRADE_IDR
        });
        logs.push(`BUY ${coin}: ${JSON.stringify(buy).slice(0,200)}`);
      }
    }
    return res.status(200).json({
      status: 'BOT 24 JAM AKTIF - SERVER MODE',
      config: CONFIG,
      logs,
      time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    });
  } catch (e) {
    return res.status(200).json({ error: e.message, logs });
  }
}
