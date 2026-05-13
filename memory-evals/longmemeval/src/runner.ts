#!/usr/bin/env tsx
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  boolFlag,
  buildClient,
  buildJudge,
  endStatus,
  err,
  loadLongMemEval,
  log,
  numberFlag,
  optionalString,
  parseArgs,
  parseEnv,
  ProgressTracker,
  type QuestionResult,
  Reporter,
  requireFlag,
  splitList,
  status,
  timer,
  warn,
} from '@memory-evals/shared';

import { askQuestion } from './ask.js';
import { ingestQuestion, type IngestedConversation } from './ingest.js';

interface RunnerOptions {
  datasetPath: string;
  questionLimit?: number;
  questionTypes?: string[];
  questionIds?: string[];
  runId: string;
  resultsRoot: string;
  teardown: boolean;
  dryRun: boolean;
  skipMemoryExtract: boolean;
}

const USAGE = `Usage:
  npm run -w longmemeval start -- --dataset <path> [--questions N] [--question-types t1,t2]
                                  [--question-ids id1,id2] [--run-id name]
                                  [--no-teardown] [--no-memory-extract]
                                  [--dry-run]

Environment: see memory-evals/README.md (KBN_URL, auth, KBN_AGENT_ID, KBN_JUDGE, ...)`;

const parseOpts = (argv: string[]): RunnerOptions => {
  const flags = parseArgs(argv, {
    booleanFlags: ['dry-run', 'no-teardown', 'no-memory-extract', 'help'],
    arrayFlags: ['question-types', 'question-ids'],
    flags: {
      'run-id': { default: defaultRunId() },
    },
  });
  if (flags.help) {
    log(USAGE);
    process.exit(0);
  }
  const datasetPath = requireFlag(flags, 'dataset');
  const questionTypes = Array.isArray(flags['question-types'])
    ? (flags['question-types'] as string[])
    : typeof flags['question-types'] === 'string'
    ? splitList(flags['question-types'] as string)
    : undefined;
  const questionIds = Array.isArray(flags['question-ids'])
    ? (flags['question-ids'] as string[])
    : typeof flags['question-ids'] === 'string'
    ? splitList(flags['question-ids'] as string)
    : undefined;
  const opts: RunnerOptions = {
    datasetPath,
    runId: requireFlag(flags, 'run-id'),
    resultsRoot: optionalString(flags, 'results-dir') ?? defaultResultsDir(),
    teardown: !boolFlag(flags, 'no-teardown'),
    dryRun: boolFlag(flags, 'dry-run'),
    skipMemoryExtract: boolFlag(flags, 'no-memory-extract'),
  };
  const ql = numberFlag(flags, 'questions');
  if (ql !== undefined) opts.questionLimit = ql;
  if (questionTypes) opts.questionTypes = questionTypes;
  if (questionIds) opts.questionIds = questionIds;
  return opts;
};

const defaultRunId = (): string => {
  const now = new Date();
  return `lme-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
};

const defaultResultsDir = (): string => {
  const here = fileURLToPath(new URL('.', import.meta.url));
  return join(here, '..', 'results');
};

async function main() {
  const opts = parseOpts(process.argv.slice(2));
  log(`LongMemEval runner — run_id=${opts.runId}`);
  log(`Dataset: ${opts.datasetPath}`);

  const items = await loadLongMemEval(opts.datasetPath);
  log(`Loaded ${items.length} question(s).`);

  const filtered = items.filter((item) => {
    if (opts.questionTypes && !opts.questionTypes.includes(item.question_type)) return false;
    if (opts.questionIds && !opts.questionIds.includes(item.question_id)) return false;
    return true;
  });
  const queue = opts.questionLimit ? filtered.slice(0, opts.questionLimit) : filtered;
  log(`Selected ${queue.length} question(s) after filters.`);

  if (opts.dryRun) {
    let totalSessions = 0;
    for (const item of queue) totalSessions += item.haystack_sessions.length;
    log(
      `DRY RUN — would ingest ${totalSessions} session(s) across ${queue.length} question(s). No Kibana calls made.`
    );
    return;
  }

  const env = parseEnv();
  const client = buildClient(env);
  const judge = buildJudge(env, 'longmemeval');
  log(`Judge: ${judge.name}`);

  const runDir = join(opts.resultsRoot, opts.runId);
  const tracker = new ProgressTracker({ dir: runDir, runId: opts.runId, benchmark: 'LongMemEval' });
  await tracker.load();

  const reporter = new Reporter({
    dir: runDir,
    benchmark: 'LongMemEval',
    extractionMethod: env.memoryExtractUrl ? 'external-memory-extract' : 'no-extract',
    feedMode: 'per-session',
  });

  // Resume cleanup: if a previous run died mid-question, delete its imports.
  const orphan = tracker.takeInFlight();
  if (orphan) {
    warn(`Resuming after crash — cleaning ${orphan.conversation_ids.length} orphan conversation(s).`);
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

  for (const item of queue) {
    processed += 1;
    if (tracker.isCompleted(item.question_id)) {
      const prior = tracker.get(item.question_id)!;
      if (prior.score === 1) correct += 1;
      if (prior.score !== null) scored += 1;
      status(`(${processed}/${queue.length}) ${item.question_id} — cached (score=${prior.score})`);
      continue;
    }

    const t = timer();
    status(`(${processed}/${queue.length}) ${item.question_id} — ingesting...`);

    let ingested: IngestedConversation[] = [];
    try {
      ingested = await ingestQuestion(item, {
        client,
        agentId: env.agentId,
        runId: opts.runId,
        skipMemoryExtract: opts.skipMemoryExtract,
      });
    } catch (e) {
      endStatus();
      err(`(${item.question_id}) ingest error: ${(e as Error).message}`);
      const failed: QuestionResult = {
        question_id: item.question_id,
        question_type: item.question_type,
        question: item.question,
        gold_answer: item.answer,
        predicted_answer: '',
        score: null,
        sessions_fed: 0,
        conversation_ids: ingested.map((i) => i.conversation_id),
        duration_ms: t.elapsed(),
        error: (e as Error).message,
      };
      await tracker.record(failed);
      continue;
    }

    await tracker.markInFlight(
      item.question_id,
      ingested.map((i) => i.conversation_id),
      env.agentId
    );

    status(`(${processed}/${queue.length}) ${item.question_id} — asking...`);
    let predictedAnswer = '';
    let rawConverse: unknown;
    try {
      const askOpts: Parameters<typeof askQuestion>[0] = {
        client,
        agentId: env.agentId,
        question: item.question,
      };
      if (env.connectorId) askOpts.connectorId = env.connectorId;
      const askResult = await askQuestion(askOpts);
      predictedAnswer = askResult.predicted_answer;
      rawConverse = askResult.raw;
    } catch (e) {
      endStatus();
      err(`(${item.question_id}) ask error: ${(e as Error).message}`);
      const failed: QuestionResult = {
        question_id: item.question_id,
        question_type: item.question_type,
        question: item.question,
        gold_answer: item.answer,
        predicted_answer: '',
        score: null,
        sessions_fed: ingested.length,
        conversation_ids: ingested.map((i) => i.conversation_id),
        duration_ms: t.elapsed(),
        error: (e as Error).message,
      };
      await tracker.record(failed);
      continue;
    }

    status(`(${processed}/${queue.length}) ${item.question_id} — scoring...`);
    let scoreResult: Awaited<ReturnType<typeof judge.score>> = null;
    try {
      scoreResult = await judge.score({
        question: item.question,
        gold_answer: item.answer,
        predicted_answer: predictedAnswer,
        category: item.question_type,
        context: { question_date: item.question_date },
      });
    } catch (e) {
      warn(`judge error for ${item.question_id}: ${(e as Error).message}`);
    }

    const result: QuestionResult = {
      question_id: item.question_id,
      question_type: item.question_type,
      question: item.question,
      gold_answer: item.answer,
      predicted_answer: predictedAnswer,
      score: scoreResult ? scoreResult.score : null,
      sessions_fed: ingested.length,
      conversation_ids: ingested.map((i) => i.conversation_id),
      duration_ms: t.elapsed(),
    };
    if (scoreResult?.reason) result.judge_reason = scoreResult.reason;

    await tracker.record(result);
    await reporter.writeRaw(item.question_id, {
      question: item,
      converse: rawConverse,
      result,
    });

    if (result.score !== null) {
      scored += 1;
      if (result.score === 1) correct += 1;
    }
    endStatus();
    log(
      `(${processed}/${queue.length}) ${item.question_id} — score=${
        result.score ?? 'n/a'
      } running=${correct}/${scored}`
    );
  }

  endStatus();
  const { summary, paths } = await reporter.write(tracker.results());
  log(`Wrote ${paths.join(', ')}`);
  log(
    `Done. correct=${summary.correct} partial=${summary.partial} accuracy=${summary.accuracy}% over ${summary.total_questions} question(s).`
  );

  if (opts.teardown) {
    log('Tearing down imported conversations...');
    try {
      const teardownResult = await client.bulkDeleteConversations({
        agent_id: env.agentId,
        created_after: runStartedAt,
      });
      log(`  deleted ${teardownResult.deleted}/${teardownResult.matched}`);
    } catch (e) {
      warn(`teardown failed: ${(e as Error).message}`);
    }
  } else {
    log('Skipping teardown (--no-teardown).');
  }
}

main().catch((e) => {
  endStatus();
  err((e as Error).stack ?? String(e));
  process.exit(1);
});
