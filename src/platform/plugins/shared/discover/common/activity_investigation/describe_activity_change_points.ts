/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getWindowParameters } from '@kbn/aiops-log-rate-analysis';
import {
  ACTIVITY_INCREASE_KINDS,
  ACTIVITY_INCREASE_SELECTION_CONFIG,
  compareActivityIncreases,
  passesActivityIncreaseFilter,
  type ActivityIncrease,
} from './activity_increase';
import {
  buildChangePointQuery,
  readChangePoints,
  MAX_CHANGE_POINT_BATCH_ROWS,
  MAX_CHANGE_POINT_BUCKETS,
  MIN_CHANGE_POINT_BUCKETS,
  type ChangePoint,
} from './change_point';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_REFERENCE_BUCKETS = 6;
const MAX_BATCH_SERIES = 96;
const MIN_CYCLE_BUCKETS = 6;
const MIN_CYCLE_CORRELATION = 0.9;
const CYCLE_DURATIONS_MS = [DAY_MS, 7 * DAY_MS];
const CHANGE_TYPES = new Set([
  'spike',
  'dip',
  'step_change',
  'trend_change',
  'distribution_change',
]);

export const ACTIVITY_CHANGE_POINT_CONFIG = {
  // Wait for half of our usual 48 buckets; this is not a confidence guarantee.
  minCompleteBuckets: 24,
  referenceWindow: 'aiops-log-rate-analysis.getWindowParameters',
  referenceStatistic: 'mean-count-per-complete-bucket',
  increaseKinds: ACTIVITY_INCREASE_KINDS,
  structuralIntervalEnd: 'local-level-fit',
  minReferenceBuckets: MIN_REFERENCE_BUCKETS,
  maxBatchSeries: MAX_BATCH_SERIES,
  maxBatchRows: MAX_CHANGE_POINT_BATCH_ROWS,
  cycleDurationsMs: CYCLE_DURATIONS_MS,
  minCycleBuckets: MIN_CYCLE_BUCKETS,
  minCycleCorrelation: MIN_CYCLE_CORRELATION,
} as const;

type Status = 'detected' | 'no-signal' | 'unassessable';
export interface ActivityChangePointDetectorConfig {
  readonly minCompleteBuckets: number;
}

export interface ActivityChangePointCandidate {
  status: Status;
  reason?: string;
  kind: string;
  pvalue: number;
  startBucket: number;
  endBucket: number;
  startTimeMs: number;
  endTimeMs: number;
  referenceStartBucket: number;
  referenceEndBucket: number;
  baseline: number | null;
  observedMean: number;
  percentageChange: number | null;
  increase: ActivityIncrease | null;
}

export interface ActivityChangePointResult {
  status: Status;
  reason?: string;
  candidates: ActivityChangePointCandidate[];
  periodBuckets?: number;
}

/** Keeps every complete series in one batch below the ES|QL response ceiling. */
export const getChangePointBatchSize = (bucketCount: number): number =>
  Math.min(MAX_BATCH_SERIES, Math.floor(MAX_CHANGE_POINT_BATCH_ROWS / (bucketCount || 1)));

const isStructural = ({ type }: ChangePoint): boolean =>
  ['step_change', 'trend_change', 'distribution_change'].includes(type);

const correlationAtLag = (counts: readonly number[], lag: number): number => {
  const before = counts.slice(0, -lag);
  const after = counts.slice(lag);
  const beforeMean = before.reduce((sum, value) => sum + value, 0) / before.length;
  const afterMean = after.reduce((sum, value) => sum + value, 0) / after.length;
  let covariance = 0;
  let beforeVariance = 0;
  let afterVariance = 0;
  before.forEach((value, index) => {
    const beforeDelta = value - beforeMean;
    const afterDelta = after[index] - afterMean;
    covariance += beforeDelta * afterDelta;
    beforeVariance += beforeDelta ** 2;
    afterVariance += afterDelta ** 2;
  });
  const scale = Math.sqrt(beforeVariance * afterVariance);
  return scale === 0 ? 0 : covariance / scale;
};

const getRepeatingPeriod = (counts: readonly number[], intervalMs: number): number | undefined =>
  CYCLE_DURATIONS_MS.map((duration) => duration / intervalMs).find(
    (period) =>
      Number.isInteger(period) &&
      period >= MIN_CYCLE_BUCKETS &&
      counts.length >= 2 * period &&
      correlationAtLag(counts, period) >= MIN_CYCLE_CORRELATION &&
      correlationAtLag(counts, Math.floor(period / 2)) < 0
  );

const estimateIncreaseEnd = (
  counts: readonly number[],
  start: number,
  limit: number,
  baseline: number
): number => {
  let endBucket = limit;
  let excess = 0;
  let bestFit = 0;
  for (let end = start + 1; end <= limit; end++) {
    excess += counts[end - 1] - baseline;
    if (excess <= 0 || (end < limit && limit - end < MIN_REFERENCE_BUCKETS)) continue;
    // Retain the measured level fit for structural changes; a trend's onset is not its peak.
    const fit = excess ** 2 / (end - start);
    if (fit >= bestFit) {
      bestFit = fit;
      endBucket = end;
    }
  }
  return endBucket;
};

/** Interprets Change Point output using AIOps windows within the selected complete series. */
export const describeActivityChangePoints = (
  counts: readonly number[],
  points: readonly ChangePoint[],
  intervalMs: number,
  startTimeMs: number,
  config: ActivityChangePointDetectorConfig = ACTIVITY_CHANGE_POINT_CONFIG
): ActivityChangePointResult => {
  if (counts.length < config.minCompleteBuckets) {
    return { status: 'unassessable', reason: 'insufficient-complete-buckets', candidates: [] };
  }
  const boundaries = points.filter(isStructural);
  // Conservative POC veto: recurring changes can make the prior baseline misleading.
  // This is not seasonal modelling and can hide real increases; short ranges or shifted
  // cycles may escape the screen.
  const periodBuckets = getRepeatingPeriod(counts, intervalMs);
  const candidates = points.map((point): ActivityChangePointCandidate => {
    const previous = boundaries.filter(({ index }) => index < point.index).at(-1)?.index ?? 0;
    const next = boundaries.find(({ index }) => index > point.index)?.index ?? counts.length;
    const pointTimeMs = startTimeMs + point.index * intervalMs;
    const { baselineMin, baselineMax } = getWindowParameters(
      pointTimeMs,
      startTimeMs,
      startTimeMs + counts.length * intervalMs,
      pointTimeMs + intervalMs,
      intervalMs
    );
    // Round inward to complete buckets; never fetch older history or cross an earlier change.
    const referenceEndBucket = Math.max(
      0,
      Math.min(point.index, Math.floor((baselineMax - startTimeMs) / intervalMs))
    );
    const referenceStartBucket = Math.min(
      referenceEndBucket,
      Math.max(previous, 0, Math.ceil((baselineMin - startTimeMs) / intervalMs))
    );
    const reference = counts.slice(referenceStartBucket, referenceEndBucket);
    const baseline =
      periodBuckets === undefined && reference.length >= MIN_REFERENCE_BUCKETS
        ? reference.reduce((sum, count) => sum + count, 0) / reference.length
        : null;
    const increaseKind = ACTIVITY_INCREASE_KINDS.find((kind) => kind === point.type);
    let endBucket = isStructural(point) ? next : point.index + 1;
    if (baseline !== null && increaseKind !== undefined) {
      endBucket = estimateIncreaseEnd(counts, point.index, next, baseline);
    }
    const observed = counts.slice(point.index, endBucket);
    const observedTotal = observed.reduce((sum, count) => sum + count, 0);
    const observedMean = observedTotal / observed.length;
    // AIOps' display-rate helper rounds counts first; retain exact rates for later selection.
    const percentageChange =
      baseline === null || baseline === 0 ? null : ((observedMean - baseline) / baseline) * 100;
    const status: Status =
      percentageChange === null
        ? 'unassessable'
        : increaseKind !== undefined && baseline !== null && observedMean > baseline
        ? 'detected'
        : 'no-signal';
    const increase: ActivityIncrease | null =
      status === 'detected' && baseline !== null && increaseKind !== undefined
        ? {
            kind: increaseKind,
            pvalue: point.pvalue,
            startTimeMs: pointTimeMs,
            endTimeMs: startTimeMs + endBucket * intervalMs,
            intervalMs,
            bucketCount: observed.length,
            baseline,
            observedMean,
            observedTotal,
            excess: observedTotal - baseline * observed.length,
            percentageChange,
          }
        : null;
    return {
      status,
      reason:
        periodBuckets !== undefined
          ? 'repeating-cycle-needs-seasonal-reference'
          : baseline === null
          ? 'fewer-than-six-reference-buckets'
          : baseline === 0
          ? 'zero-reference-no-percentage'
          : point.type === 'spike'
          ? 'kind-excluded-from-suggestions'
          : increaseKind === undefined
          ? 'not-an-upward-change-type'
          : status === 'no-signal'
          ? 'not-an-increase'
          : undefined,
      kind: point.type,
      pvalue: point.pvalue,
      startBucket: point.index,
      endBucket,
      startTimeMs: pointTimeMs,
      endTimeMs: startTimeMs + endBucket * intervalMs,
      referenceStartBucket,
      referenceEndBucket,
      baseline,
      observedMean,
      percentageChange,
      increase: increase
        ? {
            ...increase,
            referenceTimeRange: {
              startTimeMs: startTimeMs + referenceStartBucket * intervalMs,
              endTimeMs: startTimeMs + referenceEndBucket * intervalMs,
            },
          }
        : null,
    };
  });
  return {
    status:
      periodBuckets !== undefined
        ? 'unassessable'
        : candidates.some((candidate) => candidate.status === 'detected')
        ? 'detected'
        : candidates.some((candidate) => candidate.status === 'unassessable')
        ? 'unassessable'
        : 'no-signal',
    ...(periodBuckets !== undefined && { periodBuckets }),
    candidates,
  };
};

/** Filters candidates before selecting one increase per series, preserving its measured reference. */
export const getStrongestChangePointIncrease = (
  result: ActivityChangePointResult,
  minRelativeIncrease: number = ACTIVITY_INCREASE_SELECTION_CONFIG.minRelativeIncrease
): ActivityIncrease | undefined =>
  result.candidates
    .flatMap(({ increase }) => (increase ? [increase] : []))
    .filter((increase) => passesActivityIncreaseFilter(increase, minRelativeIncrease))
    .sort(compareActivityIncreases)[0];

/** Runs the same detector on every complete series, preserving input order across batches. */
export const detectActivityChangePointSeries = async ({
  series,
  execute,
  signal,
  intervalMs,
  startTimeMs,
  config = ACTIVITY_CHANGE_POINT_CONFIG,
}: {
  series: readonly (readonly number[])[];
  execute: (query: string, signal: AbortSignal) => Promise<Parameters<typeof readChangePoints>[0]>;
  signal: AbortSignal;
  intervalMs: number;
  startTimeMs: number;
  config?: ActivityChangePointDetectorConfig;
}): Promise<ActivityChangePointResult[]> => {
  signal.throwIfAborted();
  const length = series[0]?.length ?? 0;
  if (
    !Number.isSafeInteger(intervalMs) ||
    intervalMs <= 0 ||
    !Number.isSafeInteger(startTimeMs) ||
    !Number.isSafeInteger(startTimeMs + length * intervalMs) ||
    (series.length > 0 &&
      (length < MIN_CHANGE_POINT_BUCKETS || length > MAX_CHANGE_POINT_BUCKETS)) ||
    series.some(
      (counts) =>
        counts.length !== length ||
        counts.some((count) => !Number.isSafeInteger(count) || count < 0) ||
        !Number.isSafeInteger(counts.reduce((sum, count) => sum + count, 0))
    )
  ) {
    throw new Error('Expected equal, complete series of 22–1,000 safe nonnegative counts');
  }
  const results: ActivityChangePointResult[] = [];
  const batchSize = getChangePointBatchSize(length);
  for (let offset = 0; offset < series.length; offset += batchSize) {
    signal.throwIfAborted();
    const batch = series.slice(offset, offset + batchSize);
    const points = readChangePoints(await execute(buildChangePointQuery(batch), signal), batch);
    signal.throwIfAborted();
    if (!points || points.some((changes) => changes.some(({ type }) => !CHANGE_TYPES.has(type)))) {
      throw new Error('CHANGE_POINT returned invalid, incomplete or unsupported results');
    }
    results.push(
      ...points.map((changes, index) =>
        describeActivityChangePoints(batch[index], changes, intervalMs, startTimeMs, config)
      )
    );
  }
  return results;
};
