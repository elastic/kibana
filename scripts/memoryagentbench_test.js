#!/usr/bin/env node

/*
 * MemoryAgentBench Memory System Benchmark
 *
 * Tests 4 memory capabilities: Accurate Retrieval, Test-Time Learning,
 * Long-Range Understanding, Conflict Resolution.
 *
 * Each item has a large context document + multiple questions.
 * The context is fed via the extract API, then questions are asked
 * in a fresh conversation where the agent relies on memories.
 * Memories are wiped between items.
 *
 * Usage:
 *   node scripts/memoryagentbench_test.js [options]
 *
 * Options:
 *   --kibana-url       Kibana base URL (default: http://localhost:5601)
 *   --username         Kibana username (default: elastic)
 *   --password         Kibana password (default: changeme)
 *   --connector-id     Connector ID for the agent (answering questions)
 *   --split            Which split to test: AR, TTL, LRU, CR, all (default: AR)
 *   --start            First item index within the split (default: 0)
 *   --count            Number of items to test (default: 5)
 *   --max-questions    Max questions per item (default: 20)
 *   --method           Extraction method: llm, cognitive, chunking, turn (default: from config)
 *   --delay            Delay between API calls in ms (default: 2000)
 *   --chunk-size       Max chars per extract call (default: 5000)
 *   --output           Output file (default: mab_results.json)
 *   --no-cleanup       Don't wipe memories between items
 */

const fs = require('fs');
const path = require('path');
const { resolveBasePath, createApiClient, scoreAnswer, getArg, hasFlag, feedSessions, chunkText } = require('./benchmark_utils');

const DATA_FILE = path.join(__dirname, '..', 'tmp', 'memory_agent_bench.json');

const SPLIT_KEYS = {
  AR: 'Accurate_Retrieval',
  TTL: 'Test_Time_Learning',
  LRU: 'Long_Range_Understanding',
  CR: 'Conflict_Resolution',
};

const args = process.argv.slice(2);
const KIBANA_URL = getArg(args, 'kibana-url', 'http://localhost:5601');
const USERNAME = getArg(args, 'username', 'elastic');
const PASSWORD = getArg(args, 'password', 'changeme');
const CONNECTOR_ID = getArg(args, 'connector-id', null);
const SPLIT = getArg(args, 'split', 'AR');
const START_IDX = parseInt(getArg(args, 'start', '0'), 10);
const COUNT = parseInt(getArg(args, 'count', '5'), 10);
const MAX_QUESTIONS = parseInt(getArg(args, 'max-questions', '20'), 10);
const EXTRACTION_METHOD = getArg(args, 'method', null);
const FEED_MODE = getArg(args, 'feed-mode', 'chunked');
const DELAY_MS = parseInt(getArg(args, 'delay', '2000'), 10);
const CHUNK_SIZE = parseInt(getArg(args, 'chunk-size', '5000'), 10);
const OUTPUT_FILE = getArg(args, 'output', 'mab_results.json');
const NO_CLEANUP = hasFlag(args, 'no-cleanup');

function loadDataset() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`Dataset not found: ${DATA_FILE}`);
    console.error('Please download and convert MemoryAgentBench data to tmp/memory_agent_bench.json');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}



async function main() {
  console.log('=== MemoryAgentBench Memory Benchmark ===\n');

  await resolveBasePath(KIBANA_URL, USERNAME, PASSWORD);
  const api = createApiClient(KIBANA_URL, USERNAME, PASSWORD, CONNECTOR_ID);

  const dataset = loadDataset();

  // Resolve split(s)
  const splitsToTest = SPLIT === 'all'
    ? Object.keys(SPLIT_KEYS)
    : [SPLIT];

  const allResults = [];
  let globalCorrect = 0, globalPartial = 0, globalTotal = 0;
  const globalCategoryScores = {};

  for (const splitKey of splitsToTest) {
    const splitName = SPLIT_KEYS[splitKey];
    if (!splitName || !dataset[splitName]) {
      console.log(`Split '${splitKey}' not found, skipping`);
      continue;
    }

    const items = dataset[splitName];
    const selected = items.slice(START_IDX, START_IDX + COUNT);

    console.log(`\n=== Split: ${splitName} (${selected.length}/${items.length} items) ===\n`);

    for (let itemIdx = 0; itemIdx < selected.length; itemIdx++) {
      const item = selected[itemIdx];
      const context = item.context || '';
      const questions = (item.questions || []).slice(0, MAX_QUESTIONS);
      const answers = item.answers || [];
      const source = item.metadata?.source || 'unknown';

      console.log(`\n--- Item ${itemIdx + 1}/${selected.length} [${source}] ---`);
      console.log(`  Context: ${context.length} chars, Questions: ${questions.length}`);

      // Step 1: Wipe memories
      if (!NO_CLEANUP) {
        try {
          const del = await api.deleteAllMemories();
          console.log(`  Cleaned: ${del.deleted ?? 0} memories`);
        } catch {}
      }

      // Step 2: Feed context via extract API
      // MAB contexts are raw documents — wrap as a single "session" with one "turn"
      const contextAsSession = [[{ role: 'user', content: context }]];

      const feedMode = FEED_MODE === 'chunked' ? 'chunked' : FEED_MODE;
      await feedSessions(api, feedMode, contextAsSession, {
        method: EXTRACTION_METHOD,
        conversationIdPrefix: `mab-${splitKey}-${itemIdx}`,
        chunkSize: CHUNK_SIZE,
        delayMs: Math.min(DELAY_MS, 500),
        logger: console,
      });
      await new Promise((r) => setTimeout(r, 2000));

      // Step 3: Ask questions in fresh conversations
      for (let qi = 0; qi < questions.length; qi++) {
        globalTotal++;
        const question = questions[qi];
        const goldAnswers = answers[qi] || [];
        const goldAnswer = Array.isArray(goldAnswers) ? goldAnswers[0] : String(goldAnswers);

        console.log(`  Q${qi + 1}/${questions.length}: ${question.slice(0, 80)}${question.length > 80 ? '...' : ''}`);
        console.log(`    Gold: ${String(goldAnswer).slice(0, 80)}`);

        let predicted = '';
        try {
          const result = await api.converse(question, null);
          predicted = result.response?.message || '';
          console.log(`    Pred: ${predicted.slice(0, 100)}${predicted.length > 100 ? '...' : ''}`);
        } catch (err) {
          console.log(`    ✗ ${err.message.slice(0, 80)}`);
        }

        // Score against all accepted answers
        let bestScore = 0;
        const acceptedAnswers = Array.isArray(goldAnswers) ? goldAnswers : [goldAnswers];
        for (const ga of acceptedAnswers) {
          const s = scoreAnswer(predicted, String(ga));
          bestScore = Math.max(bestScore, s);
        }

        if (bestScore >= 1) { globalCorrect++; console.log(`    ✓ CORRECT`); }
        else if (bestScore >= 0.5) { globalPartial++; console.log(`    ~ PARTIAL`); }
        else { console.log(`    ✗ WRONG`); }

        if (!globalCategoryScores[splitName]) {
          globalCategoryScores[splitName] = { correct: 0, partial: 0, total: 0 };
        }
        globalCategoryScores[splitName].total++;
        if (bestScore >= 1) globalCategoryScores[splitName].correct++;
        else if (bestScore >= 0.5) globalCategoryScores[splitName].partial++;

        allResults.push({
          split: splitName, source,
          question, gold_answer: goldAnswer,
          predicted_answer: predicted, score: bestScore,
        });

        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }
  }

  // Report
  const accuracy = globalTotal > 0
    ? ((globalCorrect + globalPartial * 0.5) / globalTotal * 100).toFixed(1) : 0;

  console.log(`\n\n=== Results ===`);
  console.log(`Overall: ${globalCorrect}/${globalTotal} correct, ${globalPartial} partial (${accuracy}%)`);

  for (const [cat, s] of Object.entries(globalCategoryScores)) {
    const a = s.total > 0 ? ((s.correct + s.partial * 0.5) / s.total * 100).toFixed(1) : 0;
    console.log(`  ${cat}: ${s.correct}/${s.total} (${a}%)`);
  }

  const report = {
    timestamp: new Date().toISOString(),
    benchmark: 'MemoryAgentBench',
    extraction_method: EXTRACTION_METHOD ?? '(config)',
    feed_mode: FEED_MODE,
    total_questions: globalTotal,
    correct: globalCorrect,
    partial: globalPartial,
    accuracy: parseFloat(accuracy),
    category_scores: globalCategoryScores,
    results: allResults,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nSaved to ${OUTPUT_FILE}`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
