#!/usr/bin/env tsx
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  boolFlag,
  buildClient,
  endStatus,
  err,
  extractToolCalls,
  loadMem2Act,
  log,
  type Mem2ActScoreMode,
  type Mem2ActSample,
  numberFlag,
  optionalString,
  parseArgs,
  parseEnv,
  ProgressTracker,
  type QuestionResult,
  Reporter,
  requireFlag,
  scoreMem2Act,
  splitList,
  status,
  timer,
  warn,
} from '@memory-evals/shared';

import { askQuestion } from './ask.js';
import { ingestSample, type IngestedSample } from './ingest.js';
import {
  collectUniqueTools,
  registerMem2ActTools,
  teardownMem2ActTools,
} from './tools.js';

interface RunnerOptions {
  datasetPath: string;
  sampleIds?: string[];
  sampleLimit?: number;
  categories?: string[];
  runId: string;
  resultsRoot: string;
  scoreMode: Mem2ActScoreMode;
  registerTools: boolean;
  teardown: boolean;
  teardownTools: boolean;
  dryRun: boolean;
  skipMemoryExtract: boolean;
}

const USAGE = `Usage:
  npm run -w mem2act start -- --dataset <path>
                              [--samples N | --sample-ids id1,id2]
                              [--categories cat1,cat2]
                              [--score-mode strict|unordered|permissive]
                              [--register-tools] [--no-teardown-tools]
                              [--run-id name]
                              [--no-teardown] [--no-memory-extract]
                              [--dry-run]

Environment: see memory-evals/README.md. For --register-tools the runner
needs KBN_MCP_CONNECTOR_ID pointing at a configured MCP Stack connector that
backs the benchmark's no-op tool server.`;

const parseOpts = (argv: string[]): RunnerOptions => {
  const flags = parseArgs(argv, {
    booleanFlags: [
      'dry-run',
      'no-teardown',
      'no-teardown-tools',
      'no-memory-extract',
      'register-tools',
      'help',
    ],
    arrayFlags: ['sample-ids', 'categories'],
    flags: {
      'run-id': { default: defaultRunId() },
      'score-mode': { default: 'permissive' },
    },
  });
  if (flags.help) {
    log(USAGE);
    process.exit(0);
  }
  const datasetPath = requireFlag(flags, 'dataset');
  const sampleIds = Array.isArray(flags['sample-ids'])
    ? (flags['sample-ids'] as string[])
    : typeof flags['sample-ids'] === 'string'
    ? splitList(flags['sample-ids'] as string)
    : undefined;
  const categories = Array.isArray(flags.categories)
    ? (flags.categories as string[])
    : typeof flags.categories === 'string'
    ? splitList(flags.categories as string)
    : undefined;
  const modeRaw = String(flags['score-mode'] ?? 'permissive');
  if (modeRaw !== 'strict' && modeRaw !== 'unordered' && modeRaw !== 'permissive') {
    throw new Error(`--score-mode must be strict|unordered|permissive, got "${modeRaw}"`);
  }

  const opts: RunnerOptions = {
    datasetPath,
    runId: requireFlag(flags, 'run-id'),
    resultsRoot: optionalString(flags, 'results-dir') ?? defaultResultsDir(),
    scoreMode: modeRaw,
    registerTools: boolFlag(flags, 'register-tools'),
    teardown: !boolFlag(flags, 'no-teardown'),
    teardownTools: !boolFlag(flags, 'no-teardown-tools'),
    dryRun: boolFlag(flags, 'dry-run'),
    skipMemoryExtract: boolFlag(flags, 'no-memory-extract'),
  };
  const sl = numberFlag(flags, 'samples');
  if (sl !== undefined) opts.sampleLimit = sl;
  if (sampleIds) opts.sampleIds = sampleIds;
  if (categories) opts.categories = categories;
  return opts;
};

const defaultRunId = (): string => {
  const now = new Date();
  return `mem2act-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
};

const defaultResultsDir = (): string => {
  const here = fileURLToPath(new URL('.', import.meta.url));
  return join(here, '..', 'results');
};

const namespaceFor = (runId: string): string =>
  `mem2act-${runId}`.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');

async function main() {
  const opts = parseOpts(process.argv.slice(2));
  log(`Mem2Act runner — run_id=${opts.runId} score_mode=${opts.scoreMode}`);
  log(`Dataset: ${opts.datasetPath}`);

  const samples = await loadMem2Act(opts.datasetPath);
  log(`Loaded ${samples.length} sample(s).`);

  const idFiltered = opts.sampleIds
    ? samples.filter((s) => opts.sampleIds!.includes(s.sample_id))
    : samples;
  const catFiltered = opts.categories
    ? idFiltered.filter((s) => s.category !== undefined && opts.categories!.includes(s.category))
    : idFiltered;
  const samplesToRun = opts.sampleLimit ? catFiltered.slice(0, opts.sampleLimit) : catFiltered;
  log(`Selected ${samplesToRun.length} sample(s) after filters.`);

  if (opts.dryRun) {
    const uniqueTools = collectUniqueTools(samplesToRun);
    let goldCalls = 0;
    for (const s of samplesToRun) goldCalls += s.gold_calls.length;
    log(
      `DRY RUN — would ingest ${samplesToRun.length} sample(s), register ${uniqueTools.length} unique tool(s), and score ${goldCalls} gold call(s) across ${samplesToRun.length} question(s). No Kibana calls made.`
    );
    return;
  }

  const env = parseEnv();
  const client = buildClient(env);

  const namespace = namespaceFor(opts.runId);
  let toolsRegistered = false;
  if (opts.registerTools) {
    if (!env.mcpConnectorId) {
      throw new Error('--register-tools requires KBN_MCP_CONNECTOR_ID');
    }
    const unique = collectUniqueTools(samplesToRun);
    log(`Registering ${unique.length} MCP tool(s) under namespace "${namespace}"...`);
    await registerMem2ActTools({
      client,
      connectorId: env.mcpConnectorId,
      namespace,
      runTag: `mem2act-run:${opts.runId}`,
      tools: unique,
    });
    toolsRegistered = true;
  }

  const runDir = join(opts.resultsRoot, opts.runId);
  const tracker = new ProgressTracker({ dir: runDir, runId: opts.runId, benchmark: 'Mem2Act' });
  await tracker.load();
  const reporter = new Reporter({
    dir: runDir,
    benchmark: 'Mem2Act',
    extractionMethod: env.memoryExtractUrl ? 'external-memory-extract' : 'no-extract',
    feedMode: 'per-sample-dialogue',
  });

  const orphan = tracker.takeInFlight();
  if (orphan) {
    warn(
      `Resuming after crash — cleaning ${orphan.conversation_ids.length} orphan conversation(s).`
    );
    try {
      await client.bulkDeleteConversations({ conversation_ids: orphan.conversation_ids });
    } catch (e) {
      warn(`orphan cleanup failed: ${(e as Error).message}`);
    }
    await tracker.clearInFlight();
  }

  const runStartedAt = new Date().toISOString();
  let processed = 0;
  let scored = 0;
  let correct = 0;
  let sumF1 = 0;

  for (const sample of samplesToRun) {
    processed += 1;
    if (tracker.isCompleted(sample.sample_id)) {
      const prior = tracker.get(sample.sample_id)!;
      if (prior.score === 1) correct += 1;
      if (prior.score !== null) scored += 1;
      if (prior.tool_calls) sumF1 += prior.tool_calls.f1;
      status(`(${processed}/${samplesToRun.length}) ${sample.sample_id} — cached`);
      continue;
    }

    const t = timer();
    status(`(${processed}/${samplesToRun.length}) ${sample.sample_id} — ingesting...`);

    let ingested: IngestedSample | null = null;
    try {
      ingested = await ingestSample(sample, {
        client,
        agentId: env.agentId,
        runId: opts.runId,
        skipMemoryExtract: opts.skipMemoryExtract,
      });
    } catch (e) {
      endStatus();
      err(`(${sample.sample_id}) ingest error: ${(e as Error).message}`);
      const failed: QuestionResult = {
        question_id: sample.sample_id,
        sample_id: sample.sample_id,
        ...(sample.category !== undefined ? { category: sample.category } : {}),
        question: sample.query,
        gold_answer: formatGold(sample),
        predicted_answer: '',
        score: null,
        sessions_fed: 0,
        conversation_ids: [],
        duration_ms: t.elapsed(),
        error: (e as Error).message,
      };
      await tracker.record(failed);
      continue;
    }

    if (!ingested) {
      const skipped: QuestionResult = {
        question_id: sample.sample_id,
        sample_id: sample.sample_id,
        ...(sample.category !== undefined ? { category: sample.category } : {}),
        question: sample.query,
        gold_answer: formatGold(sample),
        predicted_answer: '',
        score: null,
        sessions_fed: 0,
        conversation_ids: [],
        duration_ms: t.elapsed(),
        error: 'empty dialogue',
      };
      await tracker.record(skipped);
      continue;
    }

    await tracker.markInFlight(sample.sample_id, [ingested.conversation_id], env.agentId);

    status(`(${processed}/${samplesToRun.length}) ${sample.sample_id} — asking...`);
    let predictedAnswer = '';
    let raw: Parameters<typeof extractToolCalls>[0] | undefined;
    try {
      const askOpts: Parameters<typeof askQuestion>[0] = {
        client,
        agentId: env.agentId,
        question: sample.query,
        conversationId: ingested.conversation_id,
      };
      if (env.connectorId) askOpts.connectorId = env.connectorId;
      const askResult = await askQuestion(askOpts);
      predictedAnswer = askResult.predicted_answer;
      raw = askResult.raw;
    } catch (e) {
      endStatus();
      err(`(${sample.sample_id}) ask error: ${(e as Error).message}`);
      const failed: QuestionResult = {
        question_id: sample.sample_id,
        sample_id: sample.sample_id,
        ...(sample.category !== undefined ? { category: sample.category } : {}),
        question: sample.query,
        gold_answer: formatGold(sample),
        predicted_answer: '',
        score: null,
        sessions_fed: 1,
        conversation_ids: [ingested.conversation_id],
        duration_ms: t.elapsed(),
        error: (e as Error).message,
      };
      await tracker.record(failed);
      continue;
    }

    const observed = raw ? extractToolCalls(raw) : [];
    const scoreResult = scoreMem2Act({
      observed,
      gold: sample.gold_calls,
      mode: opts.scoreMode,
      matchTrailingName: true,
    });

    const result: QuestionResult = {
      question_id: sample.sample_id,
      sample_id: sample.sample_id,
      ...(sample.category !== undefined ? { category: sample.category } : {}),
      question: sample.query,
      gold_answer: formatGold(sample),
      predicted_answer: predictedAnswer,
      score: scoreResult.score,
      sessions_fed: 1,
      conversation_ids: [ingested.conversation_id],
      duration_ms: t.elapsed(),
      tool_calls: {
        gold: sample.gold_calls,
        observed,
        precision: scoreResult.precision,
        recall: scoreResult.recall,
        f1: scoreResult.f1,
        mode: scoreResult.mode,
      },
    };
    await tracker.record(result);
    await reporter.writeRaw(sample.sample_id, {
      sample,
      converse: raw,
      tool_score: scoreResult,
      result,
    });

    scored += 1;
    if (result.score === 1) correct += 1;
    sumF1 += scoreResult.f1;
    endStatus();
    log(
      `(${processed}/${samplesToRun.length}) ${sample.sample_id} — exact=${
        result.score === 1 ? 'yes' : 'no'
      } f1=${scoreResult.f1.toFixed(2)} running=${correct}/${scored} avgF1=${(sumF1 / scored).toFixed(2)}`
    );
  }

  endStatus();
  const { summary, paths } = await reporter.write(tracker.results());
  log(`Wrote ${paths.join(', ')}`);
  log(
    `Done. exact=${summary.correct} accuracy=${summary.accuracy}% avg_f1=${
      scored > 0 ? (sumF1 / scored).toFixed(2) : 'n/a'
    } over ${summary.total_questions} sample(s).`
  );

  if (opts.teardown) {
    log('Tearing down imported conversations...');
    try {
      const r = await client.bulkDeleteConversations({
        agent_id: env.agentId,
        created_after: runStartedAt,
      });
      log(`  deleted ${r.deleted}/${r.matched}`);
    } catch (e) {
      warn(`teardown failed: ${(e as Error).message}`);
    }
  }

  if (toolsRegistered && opts.teardownTools) {
    log(`Tearing down MCP tools (namespace=${namespace})...`);
    const r = await teardownMem2ActTools(client, namespace, `mem2act-run:${opts.runId}`);
    log(`  deleted ${r.deleted}/${r.matched}`);
  }
}

const formatGold = (sample: Mem2ActSample): string =>
  sample.gold_calls
    .map((c) => `${c.tool_id}(${JSON.stringify(c.params ?? {})})`)
    .join(' → ');

main().catch((e) => {
  endStatus();
  err((e as Error).stack ?? String(e));
  process.exit(1);
});
