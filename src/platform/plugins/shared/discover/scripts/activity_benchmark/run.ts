/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { run } from '@kbn/dev-cli-runner';
import { z } from '@kbn/zod/v4';
import { activityInvestigationSnapshotSchema } from '../../common/activity_investigation/attachment';
import {
  buildChangePointQuery,
  readChangePoints,
} from '../../common/activity_investigation/change_point';
import { analyzeSeries, CHANGE_POINT_ANALYSIS_CONFIG } from './analyze_series';
import { collectSeries } from './collect_series';
import { createFixture } from './fixture';
import { diagnosePoisson, POISSON_DIAGNOSTIC_CONFIG } from './diagnose_poisson';
import { createScenarios } from './scenarios';
import { createSeasonalReferenceReport, SEASONAL_REFERENCE_CONFIG } from './seasonal_reference';
import { runSeasonalChangePoints } from './seasonal_change_points';
import { verifyPopulation } from './verify_population';
import { createQualityReport, scoreScenario, summarizeTimes } from './report';
import { createTransport, TIMEOUT_MS } from './transport';

const integer = (fallback: number, maximum: number) =>
  z.coerce.number().int().min(1).max(maximum).default(fallback);
const optionsSchema = z.object({
  mode: z.enum(['quality', 'data', 'verify', 'fixture', 'diagnose', 'seasonal', 'seasonal-points']),
  seed: integer(42, 2 ** 31 - 1),
  seeds: integer(1, 1000),
  groups: integer(10, 1000),
  fields: integer(1, 10),
  runs: integer(5, 1000),
  warmups: z.coerce.number().int().min(0).max(20).default(3),
  concurrency: integer(1, 5),
  topK: integer(5, 1000),
  documents: z.coerce
    .number()
    .refine((value) => [100_000, 1_000_000, 10_000_000].includes(value))
    .default(100_000),
  scope: z.string().optional(),
  scenario: z.string().optional(),
  out: z.string({ error: 'Pass --out with a new report path in a persistent directory' }),
});

run(
  async ({ flags, log }) => {
    // A help command or accidental import must never connect to a cluster.
    if (!flags.run) throw new Error('Execution requires --run after explicit approval');
    // The CLI uses empty strings for omitted string flags; let schema defaults handle them.
    const options = optionsSchema.parse(
      Object.fromEntries(Object.entries(flags).filter(([, value]) => value !== ''))
    );
    if (options.mode === 'diagnose') {
      const unsupported = [
        'seed',
        'seeds',
        'groups',
        'fields',
        'runs',
        'warmups',
        'concurrency',
        'topK',
        'documents',
        'scope',
      ].filter((name) => flags[name] !== undefined && flags[name] !== '');
      if (unsupported.length) {
        throw new Error(`Poisson diagnostics use fixed cases; omit: ${unsupported.join(', ')}`);
      }
    }
    if (options.mode === 'fixture' && !flags['create-fixture'])
      throw new Error('Fixture writes additionally require --create-fixture');
    if (['data', 'verify'].includes(options.mode)) {
      if (!options.scope) throw new Error('This mode requires --scope <frozen-scope.json>');
      if (!flags['repeatable-input'])
        throw new Error(
          'Confirm immutable data and deterministic LIMIT ordering with --repeatable-input'
        );
    }
    if (options.mode === 'seasonal' || options.mode === 'seasonal-points') {
      const unsupported = [
        'groups',
        'fields',
        'runs',
        'warmups',
        'concurrency',
        'topK',
        'documents',
        'scope',
      ].filter((name) => flags[name] !== undefined && flags[name] !== '');
      if (unsupported.length) {
        throw new Error(
          `Seasonal references use paired synthetic cases; omit: ${unsupported.join(', ')}`
        );
      }
    }
    if (
      options.scenario !== undefined &&
      (options.mode !== 'quality' ||
        !createScenarios(options.seed, 1).some(({ name }) => name === options.scenario))
    ) {
      throw new Error('--scenario requires --mode quality and an existing scenario name');
    }
    if (options.mode === 'seasonal') {
      await writeFile(options.out, '', { flag: 'wx', mode: 0o600 });
      const emit = (record: object) => appendFile(options.out, `${JSON.stringify(record)}\n`);
      await emit({
        type: 'configuration',
        mode: options.mode,
        seed: options.seed,
        seeds: options.seeds,
        at: new Date().toISOString(),
        analysis: SEASONAL_REFERENCE_CONFIG,
        measurement: 'Local synthetic reference comparison; no Elasticsearch or LLM requests',
      });
      const summary = {
        cases: 0,
        assessed: 0,
        unassessable: 0,
        falseThresholdCrossings: 0,
        missedThresholdCrossings: 0,
      };
      for (let seed = options.seed; seed < options.seed + options.seeds; seed++) {
        for (const record of createSeasonalReferenceReport(seed)) {
          await emit(record);
          summary.cases++;
          summary.assessed += Number(record.status === 'assessed');
          summary.unassessable += Number(record.status === 'unassessable');
          summary.falseThresholdCrossings += Number(record.falseThresholdCrossing === true);
          summary.missedThresholdCrossings += Number(record.missedThresholdCrossing === true);
        }
      }
      await emit({
        type: 'seasonal-reference-summary',
        ...summary,
        conclusion:
          'Inspect paired cases and estimation errors separately. Known-window reference accuracy is not automatic seasonal anomaly detection or a false-alarm guarantee.',
      });
      log.info(`Local seasonal reference report: ${options.out}`);
      log.info(JSON.stringify(summary));
      return;
    }
    const transport = createTransport();
    await writeFile(options.out, '', { flag: 'wx', mode: 0o600 });
    const emit = (record: object) => appendFile(options.out, `${JSON.stringify(record)}\n`);
    log.info(`Local report: ${options.out}`);
    await emit({
      type: 'configuration',
      ...(options.mode === 'diagnose'
        ? { mode: options.mode, ...POISSON_DIAGNOSTIC_CONFIG, out: options.out }
        : options.mode === 'seasonal-points'
        ? { mode: options.mode, seed: options.seed, seeds: options.seeds, out: options.out }
        : options),
      at: new Date().toISOString(),
      analysis: CHANGE_POINT_ANALYSIS_CONFIG,
      measurement: 'Kibana synchronous ES|QL search; excludes browser rendering and async polling',
      topKSelection: 'coverage simulation, not a faster query plan',
      percentage: 'CHANGE_POINT: exact mean rates in the bounded AIOps reference',
    });
    try {
      if (options.mode === 'fixture') {
        const fixture = await createFixture({ ...options, request: transport.request });
        const scopePath = `${options.out}.scope.json`;
        await writeFile(scopePath, JSON.stringify(fixture, null, 2), { flag: 'wx', mode: 0o600 });
        await emit({ type: 'fixture', ...fixture, scopePath });
        log.info(`Created ${fixture.indexName}; scope: ${scopePath}. No automatic deletion.`);
        return;
      }

      const { version } = z
        .object({ version: z.looseObject({ number: z.string(), build_hash: z.string() }) })
        .parse(JSON.parse(await transport.request('/', 'GET')));
      const license = z
        .object({ license: z.object({ type: z.string(), status: z.string() }) })
        .parse(JSON.parse(await transport.request('/_license', 'GET'))).license;
      // Check both command shapes against the running version; availability is not a static assumption.
      const probe = Array.from({ length: 48 }, (_, index) => (index < 24 ? 100 : 130));
      for (const series of [[probe], [probe, probe.map(() => 100)]]) {
        const table = await transport.esql(
          buildChangePointQuery(series),
          AbortSignal.timeout(TIMEOUT_MS),
          'preflight'
        );
        const points = readChangePoints(table, series);
        if (!points) throw new Error('CHANGE_POINT did not preserve the complete probe series');
        await emit({ type: 'preflight', version, license, grouped: series.length > 1, points });
      }

      if (options.mode === 'diagnose') {
        await diagnosePoisson(transport, emit);
        log.info(`Poisson diagnostic comparisons saved to ${options.out}`);
        return;
      }

      if (options.mode === 'seasonal-points') {
        await emit({
          type: 'seasonal-change-point-configuration',
          ...SEASONAL_REFERENCE_CONFIG,
          scope: 'Native candidates on synthetic counts; no Discover changes or document reads',
          cycleSelection: 'Known scenario metadata, not inferred seasonality',
          candidateWindows: 'Unchanged Discover adapter; never replaced by injected windows',
          seriesPerSearch: 1,
        });
        await runSeasonalChangePoints(transport, emit, options);
        log.info(`Seasonal candidate comparisons saved to ${options.out}`);
        return;
      }

      if (options.mode === 'quality') {
        const qualityReport = createQualityReport();
        const summary = {
          searches: 0,
          failed: 0,
          requests: 0,
          eligible: 0,
          changePointFound: 0,
          searchesWithFalseAlarms: 0,
          missedByTopK: 0,
          unassessable: 0,
        };
        for (let seed = options.seed; seed < options.seed + options.seeds; seed++) {
          const scenarios = createScenarios(seed, options.groups).filter(
            ({ name }) => options.scenario === undefined || name === options.scenario
          );
          for (const scenario of scenarios) {
            const identity = { seed, scenario: scenario.name };
            const recordStart = transport.records.length;
            summary.searches++;
            await emit({ type: 'quality-input', ...identity, series: scenario.series });
            try {
              const result = await analyzeSeries({
                series: scenario.series,
                execute: async (query, signal) => {
                  const requestId = ++summary.requests;
                  await emit({ type: 'quality-request', ...identity, requestId, query });

                  return transport.esql(query, signal, 'change_point', undefined, (raw) =>
                    emit({ type: 'quality-response', ...identity, requestId, ...raw })
                  );
                },
                signal: AbortSignal.timeout(TIMEOUT_MS),
                startTimeMs: 0,
                intervalMs: 3_600_000,
                topK: options.topK,
              });
              const score = scoreScenario(scenario, result.seriesResults);
              summary.eligible += score.eligible;
              summary.changePointFound += score.changePointFound;
              summary.missedByTopK += score.missedByTopK;
              summary.unassessable += score.unassessable;
              summary.searchesWithFalseAlarms += Number(score.searchFalseAlarm);
              await emit({
                type: 'quality',
                ...identity,
                description: scenario.description,
                score,
                ...result,
                requests: transport.records.slice(recordStart),
              });
              qualityReport.add(scenario, score);
            } catch (error) {
              summary.failed++;
              qualityReport.add(scenario, undefined);
              await emit({
                type: 'quality-error',
                ...identity,
                error: String(error),
                requests: transport.records.slice(recordStart),
              });
            }
          }
        }
        await emit({
          type: 'quality-summary',
          ...summary,
          byScenarioAndKind: qualityReport.summarize(),
          conclusion:
            'Inspect each null scenario and total series count separately; the mixed total can hide unreliable cases. Injected effects are ground truth, not a promise of detection at every noise level.',
        });
        log.info(JSON.stringify(summary));
        return;
      }

      const scopeSchema = activityInvestigationSnapshotSchema.shape.scope;
      const input = z
        .union([scopeSchema, z.object({ scope: scopeSchema, asOf: z.iso.datetime().optional() })])
        .parse(JSON.parse(await readFile(options.scope ?? '', 'utf8')));
      const scope = 'scope' in input ? input.scope : input;
      const asOfMs = 'scope' in input && input.asOf ? Date.parse(input.asOf) : Date.now();
      await emit({ type: 'scope', scope, asOf: new Date(asOfMs).toISOString() });
      if (options.mode === 'verify') {
        const verification = await verifyPopulation(
          scope,
          transport,
          {
            fieldCount: options.fields,
            maxGroups: options.groups,
            asOfMs,
          },
          AbortSignal.timeout(TIMEOUT_MS)
        );
        await emit({
          type: 'population-verification',
          ...verification,
          requests: transport.records,
        });
        log.info(JSON.stringify(verification));
        return;
      }
      const totals: Record<string, number[]> = {
        baseline: [],
        analysis: [],
        combinedBaseline: [],
        combinedAnalysis: [],
      };
      let failed = 0;
      let incomplete = 0;
      const analyze = async (signal: AbortSignal) => {
        const started = performance.now();
        const collection = await collectSeries(
          { scope, fieldCount: options.fields, maxGroups: options.groups, asOfMs },
          transport,
          signal
        );
        const collectionMs = performance.now() - started;
        const result = collection.series.length
          ? await analyzeSeries({
              series: collection.series,
              execute: (query, innerSignal) => transport.esql(query, innerSignal, 'change_point'),
              signal,
              intervalMs: collection.intervalMs,
              startTimeMs: collection.startTimeMs,
              topK: options.topK,
            })
          : undefined;
        const complete =
          result !== undefined &&
          collection.coverage.every((field) => field.status === 'complete') &&
          result.seriesResults.every(({ changePoint }) => changePoint.status !== 'unassessable');
        return {
          collection: { ...collection, series: undefined },
          complete,
          collectionMs,
          ...result,
          elapsedMs: performance.now() - started,
        };
      };
      const baseline = async (signal: AbortSignal) => {
        const started = performance.now();
        await transport.esql(scope.query, signal, 'discover-query', scope);
        return performance.now() - started;
      };
      for (let iteration = -options.warmups - 1; iteration < options.runs; iteration++) {
        const phase =
          iteration === -options.warmups - 1 ? 'first' : iteration < 0 ? 'warmup' : 'measured';
        // Rotate order to avoid consistently giving one condition a warmed query cache.
        const modes =
          iteration % 2
            ? ['combined', 'analysis', 'baseline']
            : ['baseline', 'analysis', 'combined'];
        for (const mode of modes) {
          const recordStart = transport.records.length;
          const trials = await Promise.all(
            Array.from({ length: options.concurrency }, async () => {
              const started = performance.now();
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
              const work = [
                mode !== 'analysis' ? baseline(controller.signal) : Promise.resolve(undefined),
                mode !== 'baseline' ? analyze(controller.signal) : Promise.resolve(undefined),
              ] as const;
              try {
                const [baselineMs, analysis] = await Promise.all(work);
                if (phase === 'measured') {
                  if (baselineMs !== undefined)
                    totals[mode === 'combined' ? 'combinedBaseline' : 'baseline'].push(baselineMs);
                  if (analysis)
                    totals[mode === 'combined' ? 'combinedAnalysis' : 'analysis'].push(
                      analysis.elapsedMs
                    );
                  if (analysis && !analysis.complete) incomplete++;
                }
                return { baselineMs, analysis };
              } catch (error) {
                controller.abort();
                // Do not let a cancelled sibling leak work or request measurements into the next trial.
                await Promise.allSettled(work);
                if (phase === 'measured') failed++;
                return { error: String(error), elapsedMs: performance.now() - started };
              } finally {
                clearTimeout(timer);
              }
            })
          );
          await emit({
            type: 'timing',
            iteration,
            phase,
            mode,
            trials,
            requests: transport.records.slice(recordStart),
          });
        }
      }

      const controller = new AbortController();
      const cancelStarted = performance.now();
      const timer = setTimeout(() => controller.abort(), 25);
      try {
        await analyze(controller.signal);
        await emit({ type: 'cancellation', status: 'finished-before-abort' });
      } catch (error) {
        await emit({
          type: 'cancellation',
          status: controller.signal.aborted ? 'client-aborted' : 'error',
          elapsedMs: performance.now() - cancelStarted,
          error: String(error),
          serverCancellationVerified: false,
        });
      } finally {
        clearTimeout(timer);
      }
      const timings = Object.fromEntries(
        Object.entries(totals).map(([name, times]) => [name, summarizeTimes(times)])
      );
      const p95 = timings.combinedAnalysis.p95Ms;
      await emit({
        type: 'timing-summary',
        timings,
        failed,
        incomplete,
        observedBudgetMet: failed === 0 && incomplete === 0 && p95 !== null && p95 <= 5000,
        confirmationRun: options.runs >= 50,
        limitations: [
          'Requires immutable input for repeated queries.',
          'No browser rendering or server CPU/heap measurements.',
          'Successful latency percentiles exclude failed trials; failures separately invalidate budget success.',
          'A local result does not establish production capacity or unseen-field coverage.',
        ],
      });
      log.info(JSON.stringify({ timings, failed, incomplete }));
    } catch (error) {
      await emit({ type: 'run-error', error: String(error) });
      throw error;
    }
  },
  {
    flags: {
      string: [
        'mode',
        'seed',
        'seeds',
        'groups',
        'fields',
        'runs',
        'warmups',
        'concurrency',
        'topK',
        'documents',
        'scope',
        'scenario',
        'out',
      ],
      boolean: ['run', 'create-fixture', 'repeatable-input'],
      help: `--mode quality|data|verify|fixture|diagnose|seasonal|seasonal-points  Select one experiment
--run                        Explicitly enable execution (network except in seasonal mode)
--mode seasonal              Local paired daily/weekly reference comparison; no credentials or cluster
--mode seasonal-points       Compare references on real CHANGE_POINT output; requires cluster approval
--mode diagnose              Fixed Poisson seeds 42,45,48,53,55; 1000 groups; only --run/--out apply
--scope file.json            Frozen scope or fixture manifest, required for data
--repeatable-input           Confirm immutable input and deterministic ordering for any LIMIT
--groups 10 --fields 1       Group ceiling and number of categorical fields
--runs 5 --warmups 3         Screening; use --runs 50 for confirmation
--concurrency 1              Concurrent searches, up to 5
--seed 42 --seeds 1          Repeatable quality cases; increase seeds for false-alarm estimates
--scenario name              Quality mode only: run one generated scenario (same series as a full run)
--topK 5                     Coverage-only top-K comparison
--create-fixture             Additional opt-in for writes to a NEW index
--documents 100000           Fixture size: 100000, 1000000, 10000000
--out file.jsonl             Required new report in a persistent directory; never overwritten`,
    },
  }
);
