#!/usr/bin/env node

/*
 * LoCoMo Memory System Benchmark
 *
 * Feeds LoCoMo conversation sessions via the memory extract API,
 * then asks questions in a fresh agent conversation where the agent
 * must rely entirely on extracted memories.
 *
 * Usage:
 *   node scripts/locomo_memory_test.js [options]
 *
 * Options:
 *   --kibana-url       Kibana base URL (default: http://localhost:5601)
 *   --username         Kibana username (default: elastic)
 *   --password         Kibana password (default: changeme)
 *   --connector-id     Connector ID for the agent and LLM extraction
 *   --sample           LoCoMo sample index 0-9 (default: 0)
 *   --max-sessions     Max sessions to feed (default: all)
 *   --categories       Question categories to test: 1-5 comma-separated (default: all)
 *   --method           Extraction method: llm, cognitive, chunking, turn (default: turn)
 *   --delay            Delay between API calls in ms (default: 2000)
 *   --output           Output file (default: locomo_results.json)
 *   --skip-feeding     Skip feeding, go straight to questions
 *   --skip-cleanup     Don't wipe memories before feeding
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { resolveBasePath, createApiClient, scoreAnswer, getArg, hasFlag, feedSessions } = require('./benchmark_utils');

const LOCOMO_URL = 'https://raw.githubusercontent.com/snap-research/locomo/main/data/locomo10.json';
const CACHE_FILE = path.join(__dirname, '..', 'tmp', 'locomo10.json');

const CATEGORY_NAMES = { 1: 'single-hop', 2: 'temporal', 3: 'open-domain', 4: 'multi-hop', 5: 'adversarial' };

const args = process.argv.slice(2);
const KIBANA_URL = getArg(args, 'kibana-url', 'http://localhost:5601');
const USERNAME = getArg(args, 'username', 'elastic');
const PASSWORD = getArg(args, 'password', 'changeme');
const CONNECTOR_ID = getArg(args, 'connector-id', null);
const SAMPLE_IDX = parseInt(getArg(args, 'sample', '0'), 10);
const MAX_SESSIONS = getArg(args, 'max-sessions', 'all');
const CATEGORIES = getArg(args, 'categories', 'all');
const EXTRACTION_METHOD = getArg(args, 'method', null);
const FEED_MODE = getArg(args, 'feed-mode', 'per-session');
const DELAY_MS = parseInt(getArg(args, 'delay', '2000'), 10);
const OUTPUT_FILE = getArg(args, 'output', 'locomo_results.json');
const SKIP_FEEDING = hasFlag(args, 'skip-feeding');
const SKIP_CLEANUP = hasFlag(args, 'skip-cleanup');

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.headers.location) return fetchJson(res.headers.location).then(resolve, reject);
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function loadDataset() {
  if (fs.existsSync(CACHE_FILE)) return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  console.log(`Downloading LoCoMo...`);
  const data = await fetchJson(LOCOMO_URL);
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  return data;
}

function sessionToText(session, speakerA, speakerB, dateTime) {
  const lines = [`[${dateTime}]`];
  for (const turn of session) {
    lines.push(`${turn.speaker}: ${turn.text}`);
  }
  return lines.join('\n');
}

async function main() {
  console.log('=== LoCoMo Memory Benchmark ===\n');

  await resolveBasePath(KIBANA_URL, USERNAME, PASSWORD);
  const api = createApiClient(KIBANA_URL, USERNAME, PASSWORD, CONNECTOR_ID);

  const dataset = await loadDataset();
  const sample = dataset[SAMPLE_IDX];
  const conv = sample.conversation;

  // Extract sessions
  const sessions = [];
  for (let i = 1; i <= 20; i++) {
    if (!conv[`session_${i}`]) break;
    sessions.push({
      index: i,
      dateTime: conv[`session_${i}_date_time`] || `Session ${i}`,
      dialogs: conv[`session_${i}`],
    });
  }

  // Filter questions
  let questions = sample.qa;
  if (CATEGORIES !== 'all') {
    const cats = CATEGORIES.split(',').map(Number);
    questions = questions.filter((q) => cats.includes(q.category));
  }

  console.log(`Sample ${SAMPLE_IDX}: ${conv.speaker_a} & ${conv.speaker_b}`);
  console.log(`Sessions: ${sessions.length}, Questions: ${questions.length}`);
  console.log(`Extraction method: ${EXTRACTION_METHOD ?? '(config default)'}, Feed mode: ${FEED_MODE}\n`);

  // Phase 1: Feed sessions via extract API
  if (!SKIP_FEEDING) {
    if (!SKIP_CLEANUP) {
      console.log('Cleaning existing memories...');
      try {
        const del = await api.deleteAllMemories();
        console.log(`  Deleted ${del.deleted ?? 0} memories\n`);
      } catch (err) {
        console.log(`  Cleanup failed: ${err.message}\n`);
      }
    }

    console.log('--- Phase 1: Feeding sessions via extract API ---\n');

    const maxSess = MAX_SESSIONS === 'all' ? sessions.length : parseInt(MAX_SESSIONS, 10);

    // Convert LoCoMo sessions to the generic format: Array<Array<{role, content}>>
    const genericSessions = sessions.slice(0, maxSess).map((session) =>
      session.dialogs.map((d) => ({
        role: 'user', // LoCoMo doesn't have assistant turns — it's two people chatting
        content: `[${session.dateTime}] ${d.speaker}: ${d.text}`,
      }))
    );

    const { totalMemories } = await feedSessions(api, FEED_MODE, genericSessions, {
      method: EXTRACTION_METHOD,
      conversationIdPrefix: `locomo-${SAMPLE_IDX}`,
      delayMs: Math.min(DELAY_MS, 500),
      logger: console,
    });

    console.log('Waiting 5s for indexing...\n');
    await new Promise((r) => setTimeout(r, 5000));
  }

  // Phase 2: Ask questions in a fresh conversation
  console.log('--- Phase 2: Asking questions (memory-only) ---\n');

  let questionConvId = null;
  const results = [];
  let correct = 0, partial = 0, total = 0;
  const categoryScores = {};

  // Intro message
  try {
    const intro = await api.converse(
      `I'm going to ask you questions about ${conv.speaker_a} and ${conv.speaker_b}. Answer based on what you know. If you don't know, say "I don't know".`,
      null
    );
    questionConvId = intro.conversation_id;
  } catch {}

  for (const q of questions) {
    total++;
    const catName = CATEGORY_NAMES[q.category] || `cat-${q.category}`;

    console.log(`  Q${total}/${questions.length} [${catName}] ${q.question}`);
    console.log(`    Gold: ${q.answer}`);

    let predicted = '';
    try {
      const result = await api.converse(q.question, questionConvId);
      questionConvId = result.conversation_id || questionConvId;
      predicted = result.response?.message || '';
      console.log(`    Pred: ${predicted.slice(0, 120)}${predicted.length > 120 ? '...' : ''}`);
    } catch (err) {
      console.log(`    ✗ ${err.message}`);
    }

    const score = scoreAnswer(predicted, String(q.answer));
    if (score >= 1) { correct++; console.log(`    ✓ CORRECT`); }
    else if (score >= 0.5) { partial++; console.log(`    ~ PARTIAL`); }
    else { console.log(`    ✗ WRONG`); }

    if (!categoryScores[catName]) categoryScores[catName] = { correct: 0, partial: 0, total: 0 };
    categoryScores[catName].total++;
    if (score >= 1) categoryScores[catName].correct++;
    else if (score >= 0.5) categoryScores[catName].partial++;

    results.push({
      question: q.question, gold_answer: String(q.answer),
      predicted_answer: predicted, category: catName, score,
    });

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  // Report
  const accuracy = total > 0 ? ((correct + partial * 0.5) / total * 100).toFixed(1) : 0;
  console.log(`\n=== Results ===`);
  console.log(`Overall: ${correct}/${total} correct, ${partial} partial (${accuracy}%)`);
  for (const [cat, s] of Object.entries(categoryScores)) {
    const a = s.total > 0 ? ((s.correct + s.partial * 0.5) / s.total * 100).toFixed(1) : 0;
    console.log(`  ${cat}: ${s.correct}/${s.total} (${a}%)`);
  }

  const report = {
    timestamp: new Date().toISOString(), benchmark: 'LoCoMo',
    sample_index: SAMPLE_IDX, extraction_method: EXTRACTION_METHOD ?? '(config)',
    feed_mode: FEED_MODE,
    speakers: `${conv.speaker_a} & ${conv.speaker_b}`,
    total_questions: total, correct, partial, accuracy: parseFloat(accuracy),
    category_scores: categoryScores, results,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nSaved to ${OUTPUT_FILE}`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
