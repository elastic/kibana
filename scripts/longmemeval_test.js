#!/usr/bin/env node

/*
 * LongMemEval Memory System Benchmark
 *
 * For each question: feeds haystack sessions via the extract API,
 * asks the question in a fresh conversation, scores, then wipes memories.
 *
 * Usage:
 *   node scripts/longmemeval_test.js [options]
 *
 * Options:
 *   --kibana-url       Kibana base URL (default: http://localhost:5601)
 *   --username         Kibana username (default: elastic)
 *   --password         Kibana password (default: changeme)
 *   --connector-id     Connector ID for the agent and LLM extraction
 *   --start            First question index (default: 0)
 *   --count            Number of questions (default: 10)
 *   --types            Question types comma-separated (default: all)
 *   --method           Extraction method: llm, cognitive, chunking, turn (default: turn)
 *   --delay            Delay between API calls in ms (default: 2000)
 *   --max-sessions     Max sessions per question (default: all)
 *   --output           Output file (default: longmemeval_results.json)
 *   --skip-feeding     Skip feeding, go straight to questions
 *   --no-cleanup       Don't wipe memories between questions
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { resolveBasePath, createApiClient, scoreAnswer, getArg, hasFlag, feedSessions } = require('./benchmark_utils');

const DATASET_URL = 'https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_s_cleaned.json';
const HF_API_URL = 'https://datasets-server.huggingface.co/rows?dataset=ai-hyz/MemoryAgentBench';
const CACHE_FILE = path.join(__dirname, '..', 'tmp', 'longmemeval_s.json');

const args = process.argv.slice(2);
const KIBANA_URL = getArg(args, 'kibana-url', 'http://localhost:5601');
const USERNAME = getArg(args, 'username', 'elastic');
const PASSWORD = getArg(args, 'password', 'changeme');
const CONNECTOR_ID = getArg(args, 'connector-id', null);
const START_IDX = parseInt(getArg(args, 'start', '0'), 10);
const COUNT = parseInt(getArg(args, 'count', '10'), 10);
const TYPES = getArg(args, 'types', 'all');
const EXTRACTION_METHOD = getArg(args, 'method', null);
const FEED_MODE = getArg(args, 'feed-mode', 'per-session');
const DELAY_MS = parseInt(getArg(args, 'delay', '2000'), 10);
const MAX_SESSIONS = getArg(args, 'max-sessions', 'all');
const OUTPUT_FILE = getArg(args, 'output', `longmemeval_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
const SKIP_FEEDING = hasFlag(args, 'skip-feeding');
const NO_CLEANUP = hasFlag(args, 'no-cleanup');

async function downloadJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
      if (res.statusCode >= 300 && res.headers.location) {
        return downloadJson(res.headers.location).then(resolve, reject);
      }
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function loadDataset() {
  if (fs.existsSync(CACHE_FILE)) {
    console.log(`Loading from cache: ${CACHE_FILE}`);
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  }
  console.log(`Downloading LongMemEval_S...`);
  const data = await downloadJson(DATASET_URL);
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  console.log(`Cached to ${CACHE_FILE}`);
  return data;
}

function sessionToText(session) {
  return session
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
    .join('\n');
}

async function main() {
  console.log('=== LongMemEval Memory Benchmark ===\n');

  await resolveBasePath(KIBANA_URL, USERNAME, PASSWORD);
  const api = createApiClient(KIBANA_URL, USERNAME, PASSWORD, CONNECTOR_ID);

  const dataset = await loadDataset();

  // Filter by type
  let filtered = dataset;
  if (TYPES !== 'all') {
    const types = TYPES.split(',');
    filtered = dataset.filter((q) => types.includes(q.question_type));
  }

  const selected = filtered.slice(START_IDX, START_IDX + COUNT);
  console.log(`Dataset: ${dataset.length} total, selected: ${selected.length}`);
  console.log(`Extraction method: ${EXTRACTION_METHOD}\n`);

  const results = [];
  let correct = 0, partial = 0, total = 0;
  const categoryScores = {};

  for (const item of selected) {
    total++;
    const catName = item.question_type;
    const sessions = item.haystack_sessions;
    const maxSess = MAX_SESSIONS === 'all' ? sessions.length : parseInt(MAX_SESSIONS, 10);
    const sessionsToFeed = sessions.slice(0, maxSess);

    console.log(`\n--- Q${total}/${selected.length} [${catName}] ${item.question_id} ---`);
    console.log(`  Sessions: ${sessionsToFeed.length}, Question: ${item.question}`);
    console.log(`  Gold: ${item.answer}`);

    // Step 1: Wipe memories from previous question
    if (!NO_CLEANUP && !SKIP_FEEDING) {
      try {
        const del = await api.deleteAllMemories();
        console.log(`  Cleaned: ${del.deleted ?? 0} memories`);
      } catch {}
    }

    // Step 2: Feed sessions via extract API (20 concurrent requests)
    if (!SKIP_FEEDING) {
      const { totalMemories } = await feedSessions(api, FEED_MODE, sessionsToFeed, {
        method: EXTRACTION_METHOD,
        conversationIdPrefix: `longmemeval-${item.question_id}`,
        delayMs: Math.min(DELAY_MS, 500),
        concurrency: 10,
        logger: console,
      });
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Step 3: Ask question in a fresh conversation
    let predicted = '';
    try {
      const result = await api.converse(item.question, null);
      predicted = result.response?.message || '';
      console.log(`  Pred: ${predicted.slice(0, 120)}${predicted.length > 120 ? '...' : ''}`);
    } catch (err) {
      console.log(`  ✗ Error: ${err.message.slice(0, 80)}`);
    }

    const score = scoreAnswer(predicted, item.answer);

    if (score >= 1) { correct++; console.log(`  ✓ CORRECT`); }
    else if (score >= 0.5) { partial++; console.log(`  ~ PARTIAL`); }
    else { console.log(`  ✗ WRONG`); }

    if (!categoryScores[catName]) categoryScores[catName] = { correct: 0, partial: 0, total: 0 };
    categoryScores[catName].total++;
    if (score >= 1) categoryScores[catName].correct++;
    else if (score >= 0.5) categoryScores[catName].partial++;

    results.push({
      question_id: item.question_id, question_type: catName,
      question: item.question, gold_answer: item.answer,
      predicted_answer: predicted, score,
      sessions_fed: sessionsToFeed.length,
    });

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  // Report
  const accuracy = total > 0 ? ((correct + partial * 0.5) / total * 100).toFixed(1) : 0;
  console.log(`\n\n=== Results ===`);
  console.log(`Overall: ${correct}/${total} correct, ${partial} partial (${accuracy}%)`);
  for (const [cat, s] of Object.entries(categoryScores)) {
    const a = s.total > 0 ? ((s.correct + s.partial * 0.5) / s.total * 100).toFixed(1) : 0;
    console.log(`  ${cat}: ${s.correct}/${s.total} (${a}%)`);
  }

  const report = {
    timestamp: new Date().toISOString(), benchmark: 'LongMemEval_S',
    extraction_method: EXTRACTION_METHOD ?? '(config)',
    feed_mode: FEED_MODE,
    total_questions: total, correct, partial, accuracy: parseFloat(accuracy),
    category_scores: categoryScores, results,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nSaved to ${OUTPUT_FILE}`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
