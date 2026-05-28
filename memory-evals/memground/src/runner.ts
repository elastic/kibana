#!/usr/bin/env tsx
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  boolFlag,
  buildClient,
  buildJudge,
  endStatus,
  err,
  extractToolCalls,
  loadMemGround,
  log,
  type MemGroundProbeEvent,
  type MemGroundScenario,
  type MemGroundScoringStrategy,
  numberFlag,
  optionalString,
  parseArgs,
  parseEnv,
  ProgressTracker,
  type QuestionResult,
  Reporter,
  requireFlag,
  scoreExactMatch,
  scoreMem2Act,
  splitList,
  status,
  timer,
  warn,
} from '@memory-evals/shared';

import { askProbe } from './ask.js';
import { ingestSession, type IngestSessionResult } from './ingest.js';
import { planScenario, type PlannedProbe, type PlannedSession } from './scenario.js';

interface RunnerOptions {
  datasetPath: string;
  scenarioIds?: string[];
  scenarioLimit?: number;
  probeLimit?: number;
  categories?: string[];
  runId: string;
  resultsRoot: string;
  /** Probe scoring fallback if neither probe.scoring nor scenario.default_scoring is set. */
  defaultScoring: MemGroundScoringStrategy;
  /** When true, probe rounds are sent with persist: false (default for grounding tests). */
  persistProbes: boolean;
  teardown: boolean;
  dryRun: boolean;
  skipMemoryExtract: boolean;
}

const USAGE = `Usage:
  npm run -w memground start -- --dataset <path>
                                [--samples N | --scenario-ids id1,id2]
                                [--categories cat1,cat2]
                                [--probes N]
                                [--default-scoring judge|exact|tool_call]
                                [--persist-probes]
                                [--run-id name]
                                [--no-teardown] [--no-memory-extract]
                                [--dry-run]

Environment: see memory-evals/README.md.`;

const parseOpts = (argv: string[]): RunnerOptions => {
  const flags = parseArgs(argv, {
    booleanFlags: [
      'dry-run',
      'no-teardown',
      'no-memory-extract',
      'persist-probes',
      'help',
    ],
    arrayFlags: ['scenario-ids', 'categories'],
    flags: {
      'run-id': { default: defaultRunId() },
      'default-scoring': { default: 'judge' },
    },
  });
  if (flags.help) {
    log(USAGE);
    process.exit(0);
  }
  const datasetPath = requireFlag(flags, 'dataset');
  const scenarioIds = Array.isArray(flags['scenario-ids'])
    ? (flags['scenario-ids'] as string[])
    : typeof flags['scenario-ids'] === 'string'
    ? splitList(flags['scenario-ids'] as string)
    : undefined;
  const categories = Array.isArray(flags.categories)
    ? (flags.categories as string[])
    : typeof flags.categories === 'string'
    ? splitList(flags.categories as string)
    : undefined;
  const dsRaw = String(flags['default-scoring'] ?? 'judge').toLowerCase();
  if (dsRaw !== 'judge' && dsRaw !== 'exact' && dsRaw !== 'tool_call') {
    throw new Error(
      `--default-scoring must be judge|exact|tool_call, got "${String(flags['default-scoring'])}"`
    );
  }

  const opts: RunnerOptions = {
    datasetPath,
    runId: requireFlag(flags, 'run-id'),
    resultsRoot: optionalString(flags, 'results-dir') ?? defaultResultsDir(),
    defaultScoring: dsRaw,
    persistProbes: boolFlag(flags, 'persist-probes'),
    teardown: !boolFlag(flags, 'no-teardown'),
    dryRun: boolFlag(flags, 'dry-run'),
    skipMemoryExtract: boolFlag(flags, 'no-memory-extract'),
  };
  const sl = numberFlag(flags, 'samples');
  if (sl !== undefined) opts.scenarioLimit = sl;
  const pl = numberFlag(flags, 'probes');
  if (pl !== undefined) opts.probeLimit = pl;
  if (scenarioIds) opts.scenarioIds = scenarioIds;
  if (categories) opts.categories = categories;
  return opts;
};

const defaultRunId = (): string => {
  const now = new Date();
  return `memground-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
};

const defaultResultsDir = (): string => {
  const here = fileURLToPath(new URL('.', import.meta.url));
  return join(here, '..', 'results');
};

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);

const probeId = (
  scenarioId: string,
  probe: PlannedProbe,
  fallbackIdx: number
): string =>
  probe.probe.event_id ??
  `${scenarioId}:p${fallbackIdx}:e${probe.event_idx}:${slug(probe.probe.question)}`;

const pickStrategy = (
  scenario: MemGroundScenario,
  probe: MemGroundProbeEvent,
  fallback: MemGroundScoringStrategy
): MemGroundScoringStrategy =>
  probe.scoring ?? scenario.default_scoring ?? fallback;

async function main() {
  const opts = parseOpts(process.argv.slice(2));
  log(`MemGround runner — run_id=${opts.runId} default_scoring=${opts.defaultScoring}`);
  log(`Dataset: ${opts.datasetPath}`);

  const scenarios = await loadMemGround(opts.datasetPath);
  log(`Loaded ${scenarios.length} scenario(s).`);

  const idFiltered = opts.scenarioIds
    ? scenarios.filter((s) => opts.scenarioIds!.includes(s.scenario_id))
    : scenarios;
  const catFiltered = opts.categories
    ? idFiltered.filter((s) => s.category !== undefined && opts.categories!.includes(s.category))
    : idFiltered;
  const toRun = opts.scenarioLimit ? catFiltered.slice(0, opts.scenarioLimit) : catFiltered;
  log(`Selected ${toRun.length} scenario(s) after filters.`);

  const plans = toRun.map((s) => planScenario(s));
  if (opts.dryRun) {
    let totalSessions = 0;
    let totalRounds = 0;
    let totalProbesUncapped = 0;
    for (const plan of plans) {
      totalSessions += plan.sessions.length;
      for (const session of plan.sessions) totalRounds += session.rounds.length;
      totalProbesUncapped += plan.total_probes;
    }
    const totalProbes = opts.probeLimit
      ? Math.min(totalProbesUncapped, opts.probeLimit)
      : totalProbesUncapped;
    log(
      `DRY RUN — would ingest ${totalSessions} session(s) (${totalRounds} round(s)) across ${plans.length} scenario(s), then ask ${totalProbes} probe(s). No Kibana calls made.`
    );
    return;
  }

  const env = parseEnv();
  const client = buildClient(env);
  const judge = buildJudge(env, 'memground');
  log(`Judge: ${judge.name}`);

  const runDir = join(opts.resultsRoot, opts.runId);
  const tracker = new ProgressTracker({
    dir: runDir,
    runId: opts.runId,
    benchmark: 'MemGround',
  });
  await tracker.load();
  const reporter = new Reporter({
    dir: runDir,
    benchmark: 'MemGround',
    extractionMethod: env.memoryExtractUrl ? 'external-memory-extract' : 'no-extract',
    feedMode: opts.persistProbes ? 'persist-probes' : 'probes-non-persistent',
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
  let exactCount = 0;
  let partialCount = 0;

  let globalProbesAsked = 0;
  const probeLimit = opts.probeLimit;
  for (const plan of plans) {
    if (probeLimit !== undefined && globalProbesAsked >= probeLimit) break;
    const scenario = plan.scenario;
    log(
      `Scenario ${scenario.scenario_id} — ${plan.sessions.length} session(s), ${plan.total_probes} probe(s)`
    );

    const ingestedSessions: IngestSessionResult[] = [];
    const ingestFailed: string[] = [];
    for (const session of plan.sessions) {
      try {
        const res = await ingestSession({
          client,
          agentId: env.agentId,
          runId: opts.runId,
          scenarioId: scenario.scenario_id,
          session,
          skipMemoryExtract: opts.skipMemoryExtract,
        });
        if (res) ingestedSessions.push(res);
      } catch (e) {
        const msg = (e as Error).message;
        err(`ingest failed for scenario ${scenario.scenario_id} session ${session.session_idx}: ${msg}`);
        ingestFailed.push(`session ${session.session_idx}: ${msg}`);
      }
    }

    await tracker.markInFlight(
      scenario.scenario_id,
      ingestedSessions.map((s) => s.conversation_id),
      env.agentId
    );

    const remainingGlobal =
      probeLimit !== undefined ? Math.max(0, probeLimit - globalProbesAsked) : undefined;
    const probesQueue = collectProbes(plan, remainingGlobal);
    for (let pi = 0; pi < probesQueue.length; pi++) {
      const planned = probesQueue[pi]!;
      const session = plan.sessions.find((s) => sessionContains(s, planned)) ?? plan.sessions[0]!;
      const ingestedSession = ingestedSessions[session.session_idx];
      const pid = probeId(scenario.scenario_id, planned, pi);
      processed += 1;
      globalProbesAsked += 1;

      if (tracker.isCompleted(pid)) {
        const prior = tracker.get(pid)!;
        if (prior.score !== null) {
          scored += 1;
          if (prior.score === 1) exactCount += 1;
          else if (prior.score === 0.5) partialCount += 1;
        }
        status(`(${processed}) ${pid} — cached`);
        continue;
      }

      const t = timer();
      const strategy = pickStrategy(scenario, planned.probe, opts.defaultScoring);
      const category = planned.probe.category ?? scenario.category ?? strategy;
      const conversationId = ingestedSession?.conversation_id;

      if (ingestFailed.length > 0 && !conversationId) {
        const failed: QuestionResult = {
          question_id: pid,
          sample_id: scenario.scenario_id,
          ...(category !== undefined ? { category } : {}),
          question: planned.probe.question,
          gold_answer: formatGold(planned.probe),
          predicted_answer: '',
          score: null,
          sessions_fed: ingestedSessions.length,
          conversation_ids: ingestedSessions.map((s) => s.conversation_id),
          duration_ms: t.elapsed(),
          error: `session ingest failed: ${ingestFailed.join('; ')}`,
        };
        await tracker.record(failed);
        continue;
      }

      status(`(${processed}) ${pid} — asking (${strategy})...`);
      let predictedAnswer = '';
      let raw: Parameters<typeof extractToolCalls>[0] | undefined;
      try {
        const askOpts: Parameters<typeof askProbe>[0] = {
          client,
          agentId: env.agentId,
          question: planned.probe.question,
          persistFalse: !opts.persistProbes,
        };
        if (conversationId) askOpts.conversationId = conversationId;
        if (env.connectorId) askOpts.connectorId = env.connectorId;
        const askResult = await askProbe(askOpts);
        predictedAnswer = askResult.predicted_answer;
        raw = askResult.raw;
      } catch (e) {
        endStatus();
        err(`(${pid}) ask error: ${(e as Error).message}`);
        const failed: QuestionResult = {
          question_id: pid,
          sample_id: scenario.scenario_id,
          ...(category !== undefined ? { category } : {}),
          question: planned.probe.question,
          gold_answer: formatGold(planned.probe),
          predicted_answer: '',
          score: null,
          sessions_fed: ingestedSessions.length,
          conversation_ids: ingestedSessions.map((s) => s.conversation_id),
          duration_ms: t.elapsed(),
          error: (e as Error).message,
        };
        await tracker.record(failed);
        continue;
      }

      const result: QuestionResult = {
        question_id: pid,
        sample_id: scenario.scenario_id,
        ...(category !== undefined ? { category } : {}),
        question: planned.probe.question,
        gold_answer: formatGold(planned.probe),
        predicted_answer: predictedAnswer,
        score: null,
        sessions_fed: ingestedSessions.length,
        conversation_ids: ingestedSessions.map((s) => s.conversation_id),
        duration_ms: t.elapsed(),
      };

      try {
        if (strategy === 'tool_call') {
          const observed = raw ? extractToolCalls(raw) : [];
          const gold = planned.probe.gold_calls ?? [];
          const sc = scoreMem2Act({
            observed,
            gold,
            mode: planned.probe.score_mode ?? 'permissive',
            matchTrailingName: true,
          });
          result.score = sc.score === 1 ? 1 : 0;
          result.tool_calls = {
            gold,
            observed,
            precision: sc.precision,
            recall: sc.recall,
            f1: sc.f1,
            mode: sc.mode,
          };
        } else if (strategy === 'exact') {
          const exact = scoreExactMatch({
            gold: planned.probe.answer ?? '',
            predicted: predictedAnswer,
            ...(planned.probe.exact_regex ? { regex: true } : {}),
          });
          result.score = exact.score;
          if (exact.reason) result.judge_reason = exact.reason;
        } else {
          // judge
          if (!planned.probe.answer) {
            warn(`probe ${pid} has no gold answer; skipping judge scoring.`);
          } else {
            const jr = await judge.score({
              question: planned.probe.question,
              gold_answer: planned.probe.answer,
              predicted_answer: predictedAnswer,
              category: String(category ?? ''),
            });
            if (jr) {
              result.score = jr.score;
              if (jr.reason) result.judge_reason = jr.reason;
            }
          }
        }
      } catch (e) {
        warn(`scoring error for ${pid}: ${(e as Error).message}`);
      }

      await tracker.record(result);
      await reporter.writeRaw(pid, {
        probe: planned.probe,
        converse: raw,
        strategy,
        result,
      });

      if (result.score !== null) {
        scored += 1;
        if (result.score === 1) exactCount += 1;
        else if (result.score === 0.5) partialCount += 1;
      }
      endStatus();
      log(
        `(${processed}) ${pid} [${strategy}] — score=${result.score ?? 'n/a'} running=${exactCount}+${partialCount}/${scored}`
      );
    }

    await tracker.clearInFlight();
  }

  endStatus();
  const { summary, paths } = await reporter.write(tracker.results());
  log(`Wrote ${paths.join(', ')}`);
  log(
    `Done. correct=${summary.correct} partial=${summary.partial} accuracy=${summary.accuracy}% over ${summary.total_questions} probe(s).`
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
}

const collectProbes = (
  plan: ReturnType<typeof planScenario>,
  limit: number | undefined
): PlannedProbe[] => {
  const out: PlannedProbe[] = [];
  for (const session of plan.sessions) {
    for (const p of session.probes) out.push(p);
  }
  if (limit !== undefined) return out.slice(0, limit);
  return out;
};

const sessionContains = (session: PlannedSession, probe: PlannedProbe): boolean =>
  session.probes.some((p) => p.event_idx === probe.event_idx);

const formatGold = (probe: MemGroundProbeEvent): string => {
  if (probe.gold_calls && probe.gold_calls.length > 0) {
    return probe.gold_calls
      .map((c) => `${c.tool_id}(${JSON.stringify(c.params ?? {})})`)
      .join(' → ');
  }
  return probe.answer ?? '';
};

main().catch((e) => {
  endStatus();
  err((e as Error).stack ?? String(e));
  process.exit(1);
});
