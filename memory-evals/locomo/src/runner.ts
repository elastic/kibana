#!/usr/bin/env tsx
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  boolFlag,
  buildClient,
  buildJudge,
  endStatus,
  err,
  loadLoCoMo,
  locomoGoldAnswer,
  log,
  type LoCoMoQA,
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
import { ingestSample, sampleAgentId, type IngestedSession } from './ingest.js';

interface RunnerOptions {
  datasetPath: string;
  sampleIds?: string[];
  sampleLimit?: number;
  questionLimit?: number;
  categories?: string[];
  runId: string;
  resultsRoot: string;
  teardown: boolean;
  dryRun: boolean;
  skipMemoryExtract: boolean;
  maxSessions?: number;
}

const USAGE = `Usage:
  npm run -w locomo start -- --dataset <path> [--samples N | --sample-ids id1,id2]
                             [--questions N] [--categories 1,2,3,4,5]
                             [--run-id name] [--max-sessions N]
                             [--no-teardown] [--no-memory-extract]
                             [--dry-run]

Environment: see memory-evals/README.md`;

const parseOpts = (argv: string[]): RunnerOptions => {
  const flags = parseArgs(argv, {
    booleanFlags: ['dry-run', 'no-teardown', 'no-memory-extract', 'help'],
    arrayFlags: ['sample-ids', 'categories'],
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
  const categories = Array.isArray(flags.categories)
    ? (flags.categories as string[])
    : typeof flags.categories === 'string'
    ? splitList(flags.categories as string)
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
  const ms = numberFlag(flags, 'max-sessions');
  if (ms !== undefined) opts.maxSessions = ms;
  if (sampleIds) opts.sampleIds = sampleIds;
  if (categories) opts.categories = categories;
  return opts;
};

const defaultRunId = (): string => {
  const now = new Date();
  return `locomo-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
};

const defaultResultsDir = (): string => {
  const here = fileURLToPath(new URL('.', import.meta.url));
  return join(here, '..', 'results');
};

async function main() {
  const opts = parseOpts(process.argv.slice(2));
  log(`LoCoMo runner — run_id=${opts.runId}`);
  log(`Dataset: ${opts.datasetPath}`);

  const samples = await loadLoCoMo(opts.datasetPath);
  log(`Loaded ${samples.length} sample(s).`);

  const filteredSamples = samples.filter((sample) => {
    if (opts.sampleIds && !opts.sampleIds.includes(sample.sample_id)) return false;
    return true;
  });
  const samplesToRun = opts.sampleLimit
    ? filteredSamples.slice(0, opts.sampleLimit)
    : filteredSamples;
  log(`Selected ${samplesToRun.length} sample(s) after filters.`);

  if (opts.dryRun) {
    let totalSessions = 0;
    let totalQuestions = 0;
    for (const sample of samplesToRun) {
      for (const key of Object.keys(sample.conversation)) {
        if (/^session_\d+$/.test(key)) totalSessions += 1;
      }
      totalQuestions += applyQuestionFilters(sample.qa, opts).length;
    }
    log(
      `DRY RUN — would ingest ${totalSessions} session(s) across ${samplesToRun.length} sample(s), then ask ${totalQuestions} question(s). No Kibana calls made.`
    );
    return;
  }

  const env = parseEnv();
  const client = buildClient(env);
  const judge = buildJudge(env, 'locomo');
  log(`Judge: ${judge.name}`);

  const runDir = join(opts.resultsRoot, opts.runId);
  const tracker = new ProgressTracker({ dir: runDir, runId: opts.runId, benchmark: 'LoCoMo' });
  await tracker.load();
  const reporter = new Reporter({
    dir: runDir,
    benchmark: 'LoCoMo',
    extractionMethod: env.memoryExtractUrl ? 'external-memory-extract' : 'no-extract',
    feedMode: 'per-session-shared',
  });

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
  const ingestedSampleAgents: Array<{ sampleId: string; agentId: string; startedAt: string }> = [];

  let processedQuestions = 0;
  let scored = 0;
  let correct = 0;

  for (const sample of samplesToRun) {
    const agentId = sampleAgentId(opts.runId, sample.sample_id);
    let sessions: IngestedSession[] = [];

    const cachedSample = tracker.getSample(sample.sample_id);
    if (cachedSample) {
      log(
        `Sample ${sample.sample_id}: resuming with ${cachedSample.conversation_ids.length} cached conversation(s).`
      );
      sessions = cachedSample.conversation_ids.map((id, idx) => ({
        conversation_id: id,
        session_idx: idx,
        rounds: 0,
      }));
    } else {
      const sampleStartedAt = new Date().toISOString();
      try {
        const ingestOpts: Parameters<typeof ingestSample>[1] = {
          client,
          agentId,
          runId: opts.runId,
          skipMemoryExtract: opts.skipMemoryExtract,
        };
        if (opts.maxSessions !== undefined) ingestOpts.maxSessions = opts.maxSessions;
        sessions = await ingestSample(sample, ingestOpts);
      } catch (e) {
        err(`sample ${sample.sample_id} ingest failed: ${(e as Error).message}`);
        const fail: QuestionResult = {
          question_id: `${sample.sample_id}:ingest`,
          sample_id: sample.sample_id,
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
      await tracker.recordSample(sample.sample_id, {
        conversation_ids: sessions.map((s) => s.conversation_id),
        sessions_fed: sessions.length,
        agent_id: agentId,
      });
      ingestedSampleAgents.push({
        sampleId: sample.sample_id,
        agentId,
        startedAt: sampleStartedAt,
      });
    }

    const qaQueue = applyQuestionFilters(sample.qa, opts);
    for (const qa of qaQueue) {
      processedQuestions += 1;
      const questionId = `${sample.sample_id}:${slug(qa.question)}`;
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
          agentId,
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
          category: qa.category,
          question: qa.question,
          gold_answer: locomoGoldAnswer(qa),
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

      const gold = locomoGoldAnswer(qa);
      let scoreResult: Awaited<ReturnType<typeof judge.score>> = null;
      try {
        scoreResult = await judge.score({
          question: qa.question,
          gold_answer: gold,
          predicted_answer: predictedAnswer,
          category: String(qa.category),
        });
      } catch (e) {
        warn(`judge error for ${questionId}: ${(e as Error).message}`);
      }

      const result: QuestionResult = {
        question_id: questionId,
        sample_id: sample.sample_id,
        category: qa.category,
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
  }

  endStatus();
  const { summary, paths } = await reporter.write(tracker.results());
  log(`Wrote ${paths.join(', ')}`);
  log(
    `Done. correct=${summary.correct} partial=${summary.partial} accuracy=${summary.accuracy}% over ${summary.total_questions} question(s).`
  );

  if (opts.teardown && ingestedSampleAgents.length > 0) {
    log('Tearing down per-sample agents...');
    for (const { sampleId, agentId, startedAt } of ingestedSampleAgents) {
      try {
        const r = await client.bulkDeleteConversations({
          agent_id: agentId,
          created_after: startedAt,
        });
        log(`  ${sampleId} (${agentId}) deleted ${r.deleted}/${r.matched}`);
      } catch (e) {
        warn(`teardown failed for ${sampleId}: ${(e as Error).message}`);
      }
    }
  } else if (!opts.teardown) {
    log('Skipping teardown (--no-teardown).');
  }

  // Surface the run-wide window in case the user mixed runs:
  log(`(run window: ${runStartedAt} → ${new Date().toISOString()})`);
}

const applyQuestionFilters = (qa: LoCoMoQA[], opts: RunnerOptions): LoCoMoQA[] => {
  let out = qa;
  if (opts.categories) {
    const set = new Set(opts.categories.map((c) => String(c)));
    out = out.filter((q) => set.has(String(q.category)));
  }
  if (opts.questionLimit !== undefined) out = out.slice(0, opts.questionLimit);
  return out;
};

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);

main().catch((e) => {
  endStatus();
  err((e as Error).stack ?? String(e));
  process.exit(1);
});
