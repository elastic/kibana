/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isDeepStrictEqual } from 'node:util';
import {
  buildChangePointQuery,
  readChangePoints,
  type ChangePoint,
} from '../../common/activity_investigation/change_point';
import {
  analyzeSeries,
  describeChangePointCandidates,
  getChangePointBatchSize,
  type BenchmarkSeries,
  type EsqlResult,
} from './analyze_series';
import { createScenarios } from './scenarios';
import { createQualityReport, scoreScenario } from './report';
import { TIMEOUT_MS, type Transport } from './transport';

export const POISSON_DIAGNOSTIC_CONFIG = {
  seeds: [42, 45, 48, 53, 55],
  groups: 1_000,
  intervalMs: 3_600_000,
  startTimeMs: 0,
  topK: 5,
} as const;

type Emit = (record: object) => Promise<void>;

const describeResponse = (
  response: EsqlResult,
  batch: BenchmarkSeries[],
  series: BenchmarkSeries
) => {
  const points = readChangePoints(
    response,
    batch.map(({ counts }) => counts)
  );
  const position = batch.indexOf(series);
  if (!points || position < 0) throw new Error('Replay did not preserve the complete input series');
  const reportedPoints = points[position];
  return {
    reportedPoints,
    interpretation: describeChangePointCandidates(
      series.counts,
      reportedPoints,
      POISSON_DIAGNOSTIC_CONFIG.intervalMs,
      POISSON_DIAGNOSTIC_CONFIG.startTimeMs
    ),
  };
};

const locationsAndTypes = (points: ChangePoint[]) =>
  points.map(({ index, type }) => ({ index, type }));

/** Replays fixed synthetic Poisson cases without changing the detector or its thresholds. */
export const diagnosePoisson = async (transport: Transport, emit: Emit): Promise<void> => {
  const { seeds, groups, intervalMs, startTimeMs, topK } = POISSON_DIAGNOSTIC_CONFIG;
  const quality = createQualityReport();
  const summary = {
    completedSeeds: 0,
    failedSeeds: 0,
    comparedSeries: 0,
    unstableOriginalReplay: 0,
    executionShapeDifferences: 0,
    interpretationDifferences: 0,
    detectedInEveryShape: 0,
  };
  let requestNumber = 0;

  for (const seed of seeds) {
    const scenario = createScenarios(seed, groups).find(
      ({ name }) => name === 'stationary-poisson'
    );
    if (!scenario) throw new Error('Missing stationary Poisson scenario');

    const responses = new Map<string, EsqlResult>();
    const measurementStart = transport.records.length;
    let discoveryScored = false;
    const execute = async (query: string, signal: AbortSignal, variant: string) => {
      const requestId = ++requestNumber;
      await emit({ type: 'diagnostic-request', seed, requestId, variant, query });
      const response = await transport.esql(query, signal, 'poisson-diagnostic', undefined, (raw) =>
        emit({ type: 'diagnostic-response', seed, requestId, variant, ...raw })
      );
      if (variant === 'discovery') responses.set(query, response);
      return response;
    };

    try {
      const bucketCount = scenario.series[0].counts.length;
      const batchSize = getChangePointBatchSize(bucketCount);
      await emit({
        type: 'diagnostic-input',
        seed,
        scenario: scenario.name,
        totalSeriesCount: scenario.series.length,
        batchSize,
        bucketCount,
        intervalMs,
        startTimeMs,
        series: scenario.series,
      });
      const result = await analyzeSeries({
        series: scenario.series,
        execute: (query, signal) => execute(query, signal, 'discovery'),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        intervalMs,
        startTimeMs,
        topK,
      });
      const score = scoreScenario(scenario, result.seriesResults);
      quality.add(scenario, score);
      discoveryScored = true;
      await emit({ type: 'diagnostic-discovery', seed, score, ...result });

      const ranked = result.seriesResults
        .map(({ changePoint }, index) => ({
          index,
          status: changePoint.status,
          pvalue: Math.min(
            ...changePoint.candidates
              .filter(({ status }) => status === 'detected')
              .map(({ pvalue }) => pvalue)
          ),
        }))
        .filter(({ status }) => status === 'detected')
        .sort((left, right) => left.pvalue - right.pvalue || left.index - right.index);
      const controlIndex = result.seriesResults.findIndex(
        ({ changePoint }) => changePoint.status === 'no-signal'
      );
      if (ranked.length < 2 || controlIndex < 0) {
        throw new Error(
          'Cannot select two detected series and one no-signal control for this seed'
        );
      }
      const selected = [...ranked.slice(0, 2).map(({ index }) => index), controlIndex];
      await emit({
        type: 'diagnostic-selection',
        seed,
        selection: 'Two detected series with lowest p-value, then the first no-signal control',
        seriesIndices: selected,
      });

      for (const seriesIndex of selected) {
        const series = scenario.series[seriesIndex];
        const offset = Math.floor(seriesIndex / batchSize) * batchSize;
        const originalBatch = scenario.series.slice(offset, offset + batchSize);
        const originalQuery = buildChangePointQuery(originalBatch.map(({ counts }) => counts));
        const originalResponse = responses.get(originalQuery);
        if (!originalResponse) throw new Error('Missing original discovery batch response');
        const { reportedPoints } = describeResponse(originalResponse, originalBatch, series);
        const original = {
          reportedPoints,
          // Compare against the real discovery output, not a second reconstruction of its adapter.
          interpretation: result.seriesResults[seriesIndex].changePoint,
        };
        const comparisons = [];

        for (const { variant, batch } of [
          { variant: 'single', batch: [series] },
          { variant: 'original-batch', batch: originalBatch },
          { variant: 'reversed-batch', batch: [...originalBatch].reverse() },
        ]) {
          const query = buildChangePointQuery(batch.map(({ counts }) => counts));
          const response = await execute(query, AbortSignal.timeout(TIMEOUT_MS), variant);
          const replay = describeResponse(response, batch, series);
          const comparison = {
            variant,
            sameReportedPoints: isDeepStrictEqual(original.reportedPoints, replay.reportedPoints),
            sameLocationsAndTypes: isDeepStrictEqual(
              locationsAndTypes(original.reportedPoints),
              locationsAndTypes(replay.reportedPoints)
            ),
            sameInterpretation: isDeepStrictEqual(original.interpretation, replay.interpretation),
            ...replay,
          };
          comparisons.push(comparison);
          await emit({
            type: 'diagnostic-comparison',
            seed,
            seriesIndex,
            field: series.field,
            value: series.value,
            batchOffset: offset,
            requestId: requestNumber,
            original,
            ...comparison,
          });
        }

        const repeat = comparisons.find(({ variant }) => variant === 'original-batch');
        const unstable = repeat?.sameReportedPoints !== true;
        const shapeDifference = comparisons.some(({ sameReportedPoints }) => !sameReportedPoints);
        const adapterDifference = comparisons.some(
          ({ sameReportedPoints, sameInterpretation }) => sameReportedPoints && !sameInterpretation
        );
        const detectedEverywhere =
          original.interpretation.status === 'detected' &&
          comparisons.every(({ interpretation }) => interpretation.status === 'detected');
        summary.comparedSeries++;
        summary.unstableOriginalReplay += Number(unstable);
        summary.executionShapeDifferences += Number(!unstable && shapeDifference);
        summary.interpretationDifferences += Number(adapterDifference);
        summary.detectedInEveryShape += Number(detectedEverywhere);
        await emit({
          type: 'diagnostic-finding',
          seed,
          seriesIndex,
          outcome: unstable
            ? 'original-replay-differs-cannot-isolate-grouping'
            : shapeDifference
            ? 'execution-shape-difference-needs-investigation'
            : adapterDifference
            ? 'interpretation-differs-for-identical-points'
            : detectedEverywhere
            ? 'same-change-point-signal-on-stationary-noise'
            : 'consistent-control',
          // CHANGE_POINT returns a location, not a duration; expanded windows are local estimates.
          estimatedIntervals: original.interpretation.candidates.map((candidate) => ({
            reportedPoint: candidate.startBucket,
            kind: candidate.kind,
            startBucket: candidate.startBucket,
            endBucket: candidate.endBucket,
            durationBuckets: candidate.endBucket - candidate.startBucket,
            percentageChange: candidate.percentageChange,
            status: candidate.status,
          })),
        });
      }
      summary.completedSeeds++;
    } catch (error) {
      summary.failedSeeds++;
      if (!discoveryScored) quality.add(scenario, undefined);
      await emit({ type: 'diagnostic-error', seed, error: String(error) });
    }
    await emit({
      type: 'diagnostic-requests',
      seed,
      requests: transport.records.slice(measurementStart),
    });
  }

  await emit({
    type: 'diagnostic-summary',
    ...summary,
    complete:
      summary.completedSeeds === seeds.length && summary.comparedSeries === seeds.length * 3,
    quality: quality.summarize(),
    limitations: [
      'Selected known problematic seeds are diagnostic evidence, not held-out accuracy estimates.',
      'Matching outputs across shapes do not establish that p-values are calibrated.',
      'A reported point is distinct from the locally estimated interval and percentage.',
      'Raw synthetic response capture adds I/O; these timings are not performance benchmarks.',
    ],
  });
  if (summary.failedSeeds > 0) {
    throw new Error('Poisson diagnostics are incomplete; inspect diagnostic-error records');
  }
};
