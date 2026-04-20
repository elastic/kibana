/*
 * Shared utilities for memory benchmark scripts.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

let basePath = '';

async function resolveBasePath(kibanaUrl, username, password) {
  try {
    await new Promise((resolve, reject) => {
      const url = new URL(kibanaUrl);
      const client = url.protocol === 'https:' ? https : http;
      client.get({
        hostname: url.hostname, port: url.port, path: '/',
        headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` },
        rejectUnauthorized: false,
      }, (r) => {
        if (r.statusCode >= 300 && r.headers.location) {
          basePath = new URL(r.headers.location, kibanaUrl).pathname.replace(/\/+$/, '');
        }
        r.on('data', () => {});
        r.on('end', resolve);
      }).on('error', reject);
    });
  } catch {}
  return basePath;
}

async function kibanaRequest(kibanaUrl, username, password, method, apiPath, body, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiPath, kibanaUrl);
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true',
        'elastic-api-version': '2023-10-31',
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
        else { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function createApiClient(kibanaUrl, username, password, connectorId) {
  const req = (method, path, body) => kibanaRequest(kibanaUrl, username, password, method, path, body);

  return {
    async converse(input, conversationId) {
      const body = { input, agent_id: 'elastic-ai-agent' };
      if (conversationId) body.conversation_id = conversationId;
      if (connectorId) body.connector_id = connectorId;
      return req('POST', `${basePath}/api/agent_builder/converse`, body);
    },

    async extractMemories(message, method, convId, timestamp) {
      const body = { message };
      if (method) body.method = method;
      // Don't pass connector_id — let the API fall back to kibana.yml config
      if (convId) body.conversation_id = convId;
      if (timestamp) body.timestamp = timestamp;
      return req('POST', `${basePath}/internal/agent_builder/memory/extract`, body);
    },

    async deleteAllMemories() {
      return req('DELETE', `${basePath}/internal/agent_builder/memory`);
    },

    async listMemories() {
      return req('GET', `${basePath}/internal/agent_builder/memory`);
    },

    async getConversation(conversationId) {
      return req('GET', `${basePath}/internal/agent_builder/conversations/${conversationId}`);
    },

    async triggerConsolidation(opts = {}) {
      const body = { full_log: !!opts.fullLog };
      return kibanaRequest(kibanaUrl, username, password, 'POST', `${basePath}/internal/agent_builder/memory/consolidate`, body, 10 * 60 * 1000);
    },
  };
}

function scoreAnswer(predicted, gold) {
  if (!predicted || !gold) return 0;

  const normalize = (s) =>
    String(s).toLowerCase().replace(/\*\*/g, '').replace(/\*/g, '')
      .replace(/`/g, '').replace(/\s+/g, ' ').trim();

  const predNorm = normalize(predicted);
  const goldNorm = normalize(gold);

  if (predNorm === goldNorm) return 1;
  if (predNorm.includes(goldNorm)) return 1;

  const normDate = (s) => s.replace(/,/g, '').replace(/(\d+)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d+)/g, '$2 $1 $3');
  if (normDate(predNorm).includes(normDate(goldNorm))) return 1;

  const goldWords = goldNorm.split(/\W+/).filter((w) => w.length > 2);
  if (goldWords.length > 0 && goldWords.every((w) => predNorm.includes(w))) return 1;

  const goldNum = goldNorm.replace(/[^0-9.]/g, '');
  if (goldNum.length >= 4 && predNorm.includes(goldNum)) return 1;

  const predWords = new Set(predNorm.split(/\W+/).filter((w) => w.length > 2));
  const intersection = goldWords.filter((w) => predWords.has(w)).length;
  const recall = goldWords.length > 0 ? intersection / goldWords.length : 0;

  if (recall >= 0.8) return 1;
  if (recall >= 0.6) return 0.5;
  return 0;
}

function loadState(stateFile) {
  try { return fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf-8')) : {}; }
  catch { return {}; }
}

function saveState(stateFile, state) {
  const dir = path.dirname(stateFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function getArg(args, name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return idx === -1 ? defaultVal : (args[idx + 1] ?? defaultVal);
}

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

/**
 * Run an array of async tasks with bounded concurrency.
 *
 * @param tasks - Array of async functions to execute
 * @param concurrency - Max number of tasks running at the same time
 * @returns Array of results in the same order as tasks
 */
async function runWithConcurrency(tasks, concurrency) {
  const results = new Array(tasks.length);
  let nextIndex = 0;

  const runNext = async () => {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      results[idx] = await tasks[idx]();
    }
  };

  const workers = [];
  for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
    workers.push(runNext());
  }
  await Promise.all(workers);
  return results;
}

/**
 * Feed content to the extract API based on the chosen feed mode.
 *
 * @param api - API client
 * @param feedMode - 'whole', 'per-session', 'per-turn', 'chunked'
 * @param sessions - Array of sessions, each being an array of { role, content } turns
 * @param options - { method, conversationIdPrefix, chunkSize, delayMs, logger, concurrency }
 * @returns { totalMemories, totalCalls }
 */
async function feedSessions(api, feedMode, sessions, options = {}) {
  const {
    method,
    conversationIdPrefix = 'feed',
    chunkSize = 5000,
    delayMs = 500,
    concurrency = 1,
    timestamps,
    logger = console,
  } = options;

  let totalMemories = 0;
  let totalCalls = 0;

  const extract = async (message, convId, timestamp) => {
    try {
      const result = await api.extractMemories(message, method, convId, timestamp);
      totalMemories += result.created ?? 0;
      totalCalls++;
    } catch (err) {
      logger.log(`    ✗ Extract error: ${err.message?.slice(0, 80)}`);
    }
    if (concurrency <= 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  };

  switch (feedMode) {
    case 'whole': {
      const allText = sessions
        .map((session, si) =>
          session.map((t) => `${t.role === 'user' ? 'User' : t.role === 'assistant' ? 'Assistant' : t.role}: ${t.content}`).join('\n')
        )
        .join('\n\n---\n\n');

      if (allText.length > chunkSize) {
        const chunks = chunkText(allText, chunkSize);
        logger.log(`  Feeding whole (${chunks.length} chunks, ${allText.length} chars)...`);
        const tasks = chunks.map((chunk, ci) => () => extract(chunk, `${conversationIdPrefix}-whole-${ci}`));
        await runWithConcurrency(tasks, concurrency);
      } else {
        logger.log(`  Feeding whole (1 message, ${allText.length} chars)...`);
        await extract(allText, `${conversationIdPrefix}-whole`);
      }
      break;
    }

    case 'per-session': {
      logger.log(`  Feeding ${sessions.length} sessions (concurrency=${concurrency})...`);
      const tasks = [];
      for (let si = 0; si < sessions.length; si++) {
        const sessionText = sessions[si]
          .map((t) => `${t.role === 'user' ? 'User' : t.role === 'assistant' ? 'Assistant' : t.role}: ${t.content}`)
          .join('\n');
        if (!sessionText.trim()) continue;
        const idx = si;
        const ts = timestamps?.[si];
        tasks.push(async () => {
          const t0 = Date.now();
          await extract(sessionText, `${conversationIdPrefix}-session-${idx}`, ts);
          logger.log(`    ✓ session ${idx + 1}/${sessions.length} (${totalMemories} memories, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
        });
      }
      await runWithConcurrency(tasks, concurrency);
      break;
    }

    case 'per-turn': {
      let turnCount = 0;
      const tasks = [];
      for (let si = 0; si < sessions.length; si++) {
        const session = sessions[si];
        const ts = timestamps?.[si];
        for (let ti = 0; ti < session.length; ti += 2) {
          const userTurn = session[ti];
          const assistantTurn = session[ti + 1];
          const parts = [];
          if (userTurn) parts.push(`User: ${userTurn.content}`);
          if (assistantTurn) parts.push(`Assistant: ${assistantTurn.content}`);
          const turnText = parts.join('\n');
          if (!turnText.trim()) continue;
          const convId = `${conversationIdPrefix}-s${si}-t${ti}`;
          tasks.push(async () => {
            await extract(turnText, convId, ts);
            turnCount++;
          });
        }
      }
      logger.log(`  Feeding ${tasks.length} turns across ${sessions.length} sessions (concurrency=${concurrency})...`);
      await runWithConcurrency(tasks, concurrency);
      logger.log(`  Fed ${turnCount} turns across ${sessions.length} sessions`);
      break;
    }

    case 'chunked': {
      const allText = sessions
        .map((session) =>
          session.map((t) => t.content).join('\n')
        )
        .join('\n\n');

      const chunks = chunkText(allText, chunkSize);
      logger.log(`  Feeding ${chunks.length} chunks (${allText.length} chars, concurrency=${concurrency})...`);
      const tasks = chunks.map((chunk, ci) => () => extract(chunk, `${conversationIdPrefix}-chunk-${ci}`));
      await runWithConcurrency(tasks, concurrency);
      break;
    }

    default:
      logger.log(`  Unknown feed mode: ${feedMode}, using 'per-session'`);
      return feedSessions(api, 'per-session', sessions, options);
  }

  logger.log(`  Total: ${totalMemories} memories from ${totalCalls} extract calls`);
  return { totalMemories, totalCalls };
}

function chunkText(text, maxChars) {
  const chunks = [];
  const paragraphs = text.split(/\n{2,}/);
  let current = '';
  for (const para of paragraphs) {
    if (current.length + para.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = '';
    }
    current += para + '\n\n';
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

module.exports = {
  resolveBasePath,
  createApiClient,
  scoreAnswer,
  loadState,
  saveState,
  getArg,
  hasFlag,
  feedSessions,
  chunkText,
  runWithConcurrency,
};
