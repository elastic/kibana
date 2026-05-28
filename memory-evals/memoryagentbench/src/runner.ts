#!/usr/bin/env tsx
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  boolFlag,
  buildClient,
  buildJudge,
  endStatus,
  err,
  loadMemoryAgentBench,
  log,
  mabGoldAnswer,
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
import type { MemoryAgentBenchQA, MemoryAgentBenchSample } from '@memory-evals/shared';

import { askQuestion } from './ask.js';
import { ingestSample, type IngestedSession } from './ingest.js';

interface RunnerOptions {
  datasetPath: string;
  sampleIds?: string[];
  sampleLimit?: number;
  questionLimit?: number;
  tasks?: string[];
  runId: string;
  resultsRoot: string;
  teardown: boolean;
  dryRun: boolean;
  skipMemoryExtract: boolean;
  sessionSize?: number;
  maxSessions?: number;
}

const USAGE = `Usage:
  npm run -w memoryagentbench start -- --dataset <path>
                                        [--samples N | --sample-ids id1,id2]
                                        [--tasks AR,TTL,LRU,CR]
                                        [--questions N]
                                        [--session-size N] [--max-sessions N]
                                        [--run-id name]
                                        [--no-teardown] [--no-memory-extract]
                                        [--dry-run]

Environment: see memory-evals/README.md`;

const parseOpts = (argv: string[]): RunnerOptions => {
  const flags = parseArgs(argv, {
    booleanFlags: ['dry-run', 'no-teardown', 'no-memory-extract', 'help'],
    arrayFlags: ['sample-ids', 'tasks'],
    flags: {
      'run-id': { default: defaultRunId() },
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
  const tasks = Array.isArray(flags.tasks)
    ? (flags.tasks as string[])
    : typeof flags.tasks === 'string'
    ? splitList(flags.tasks as string)
    : undefined;

  const opts: RunnerOptions = {
    datasetPath,
    runId: requireFlag(flags, 'run-id'),
    resultsRoot: optionalString(flags, 'results-dir') ?? defaultResultsDir(),
    teardown: !boolFlag(flags, 'no-teardown'),
    dryRun: boolFlag(flags, 'dry-run'),
    skipMemoryExtract: boolFlag(flags, 'no-memory-extract'),
  };
  const sl = numberFlag(flags, 'samples');
  if (sl !== undefined) opts.sampleLimit = sl;
  const ql = numberFlag(flags, 'questions');
  if (ql !== undefined) opts.questionLimit = ql;
  const ss = numberFlag(flags, 'session-size');
  if (ss !== undefined) opts.sessionSize = ss;
  const ms = numberFlag(flags, 'max-sessions');
  if (ms !== undefined) opts.maxSessions = ms;
  if (sampleIds) opts.sampleIds = sampleIds;
  if (tasks) opts.tasks = tasks.map((t) => t.toUpperCase());
  return opts;
};

const defaultRunId = (): string => {
  const now = new Date();
  return `mab-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
};

const defaultResultsDir = (): string => {
  const here = fileURLToPath(new URL('.', import.meta.url));
  return join(here, '..', 'results');
};

const applyTaskFilter = (
  samples: MemoryAgentBenchSample[],
  tasks: string[] | undefined
): MemoryAgentBenchSample[] => {
  if (!tasks || tasks.length === 0) return samples;
  const set = new Set(tasks);
  return samples.filter((s) => set.has(s.task));
};

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);

async function main() {
  const opts = parseOpts(process.argv.slice(2));
  log(`MemoryAgentBench runner — run_id=${opts.runId}`);
  log(`Dataset: ${opts.datasetPath}`);

  const samples = await loadMemoryAgentBench(opts.datasetPath);
  log(`Loaded ${samples.length} sample(s).`);

  const idFiltered = opts.sampleIds
    ? samples.filter((s) => opts.sampleIds!.includes(s.sample_id))
    : samples;
  const taskFiltered = applyTaskFilter(idFiltered, opts.tasks);
  const samplesToRun = opts.sampleLimit ? taskFiltered.slice(0, opts.sampleLimit) : taskFiltered;
  log(`Selected ${samplesToRun.length} sample(s) after filters.`);

  if (opts.dryRun) {
    let totalQuestions = 0;
    for (const sample of samplesToRun) {
      const qaCount = opts.questionLimit
        ? Math.min(sample.qa.length, opts.questionLimit)
        : sample.qa.length;
      totalQuestions += qaCount;
    }
    log(
      `DRY RUN — would ingest ${samplesToRun.length} sample(s), then ask ${totalQuestions} question(s). No Kibana calls made.`
    );
    return;
  }

  const env = parseEnv();
  const client = buildClient(env);
  const judge = buildJudge(env, 'memoryagentbench');
  log(`Judge: ${judge.name}`);

  const runDir = join(opts.resultsRoot, opts.runId);
  const tracker = new ProgressTracker({
    dir: runDir,
    runId: opts.runId,
    benchmark: 'MemoryAgentBench',
  });
  await tracker.load();
  const reporter = new Reporter({
    dir: runDir,
    benchmark: 'MemoryAgentBench',
    extractionMethod: env.memoryExtractUrl ? 'external-memory-extract' : 'no-extract',
    feedMode: opts.sessionSize ? `chunked-${opts.sessionSize}` : 'per-sample',
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
  let processedQuestions = 0;
  let scored = 0;
  let correct = 0;

  for (const sample of samplesToRun) {
    let sessions: IngestedSession[] = [];
    try {
      const ingestOpts: Parameters<typeof ingestSample>[1] = {
        client,
        agentId: env.agentId,
        runId: opts.runId,
        skipMemoryExtract: opts.skipMemoryExtract,
      };
      if (opts.sessionSize !== undefined) ingestOpts.sessionSize = opts.sessionSize;
      if (opts.maxSessions !== undefined) ingestOpts.maxSessions = opts.maxSessions;
      sessions = await ingestSample(sample, ingestOpts);
    } catch (e) {
      err(`sample ${sample.sample_id} ingest failed: ${(e as Error).message}`);
      const fail: QuestionResult = {
        question_id: `${sample.sample_id}:ingest`,
        sample_id: sample.sample_id,
        category: sample.task,
        question: '(ingest failed)',
        gold_answer: '',
        predicted_answer: '',
        score: null,
        sessions_fed: 0,
        conversation_ids: [],
        duration_ms: 0,
        error: (e as Error).message,
      };
      await tracker.record(fail);
      continue;
    }

    await tracker.markInFlight(
      sample.sample_id,
      sessions.map((s) => s.conversation_id),
      env.agentId
    );

    const queue = applyQuestionFilters(sample.qa, opts);
    for (let qi = 0; qi < queue.length; qi++) {
      const qa = queue[qi]!;
      const questionId = qa.qa_id ?? `${sample.sample_id}:${qi}:${slug(qa.question)}`;
      processedQuestions += 1;
      if (tracker.isCompleted(questionId)) {
        const prior = tracker.get(questionId)!;
        if (prior.score === 1) correct += 1;
        if (prior.score !== null) scored += 1;
        status(`(${processedQuestions}) ${questionId} — cached`);
        continue;
      }

      const t = timer();
      status(`(${processedQuestions}) ${questionId} — asking...`);

      let predictedAnswer = '';
      let raw: unknown;
      try {
        const askOpts: Parameters<typeof askQuestion>[0] = {
          client,
          agentId: env.agentId,
          question: qa.question,
        };
        if (env.connectorId) askOpts.connectorId = env.connectorId;
        const askResult = await askQuestion(askOpts);
        predictedAnswer = askResult.predicted_answer;
        raw = askResult.raw;
      } catch (e) {
        endStatus();
        err(`(${questionId}) ask error: ${(e as Error).message}`);
        const failed: QuestionResult = {
          question_id: questionId,
          sample_id: sample.sample_id,
          category: sample.task,
          question: qa.question,
          gold_answer: mabGoldAnswer(qa),
          predicted_answer: '',
          score: null,
          sessions_fed: sessions.length,
          conversation_ids: sessions.map((s) => s.conversation_id),
          duration_ms: t.elapsed(),
          error: (e as Error).message,
        };
        await tracker.record(failed);
        continue;
      }

      const gold = mabGoldAnswer(qa);
      let scoreResult: Awaited<ReturnType<typeof judge.score>> = null;
      try {
        scoreResult = await judge.score({
          question: qa.question,
          gold_answer: gold,
          predicted_answer: predictedAnswer,
          category: sample.task,
        });
      } catch (e) {
        warn(`judge error for ${questionId}: ${(e as Error).message}`);
      }

      const result: QuestionResult = {
        question_id: questionId,
        sample_id: sample.sample_id,
        category: sample.task,
        question: qa.question,
        gold_answer: gold,
        predicted_answer: predictedAnswer,
        score: scoreResult ? scoreResult.score : null,
        sessions_fed: sessions.length,
        conversation_ids: sessions.map((s) => s.conversation_id),
        duration_ms: t.elapsed(),
      };
      if (scoreResult?.reason) result.judge_reason = scoreResult.reason;
      await tracker.record(result);
      await reporter.writeRaw(questionId, { qa, converse: raw, result });

      if (result.score !== null) {
        scored += 1;
        if (result.score === 1) correct += 1;
      }
      endStatus();
      log(
        `(${processedQuestions}) ${questionId} — score=${
          result.score ?? 'n/a'
        } running=${correct}/${scored}`
      );
    }

    await tracker.clearInFlight();
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

const applyQuestionFilters = (
  qa: MemoryAgentBenchQA[],
  opts: RunnerOptions
): MemoryAgentBenchQA[] => {
  let out = qa;
  if (opts.questionLimit !== undefined) out = out.slice(0, opts.questionLimit);
  return out;
};

main().catch((e) => {
  endStatus();
  err((e as Error).stack ?? String(e));
  process.exit(1);
});
