/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACTIVITY_INCREASE_KINDS } from '../../common/activity_investigation/activity_increase';
import {
  CHANGE_POINT_ANALYSIS_CONFIG,
  describeChangePointCandidates,
  type Candidate,
} from './analyze_series';
import {
  createSeasonalResidualSeries,
  measureSeasonalReference,
  type SeasonalReferenceInput,
} from './seasonal_reference';

export const SEASONAL_RESIDUAL_INTERVAL_CONFIG = {
  input: 'Observed counts minus corresponding three-cycle expected counts; no zero padding',
  intervalMethod: 'Unchanged Discover adapter on the available residual tail',
  percentage: 'Original observed and expected totals on the residual-estimated interval',
  decisions: 'Diagnostic only; residual adapter decisions are discarded',
  pvalues: 'Original ES points on raw counts, not significance tests on residuals',
} as const;

type ResidualInterval =
  | { status: 'unassessable'; reason: string }
  | {
      status: 'assessed';
      startBucket: number;
      endBucket: number;
      residualReferenceMean: number;
      seasonalReference: ReturnType<typeof measureSeasonalReference>;
    };

interface ResidualIntervalComparison {
  series: ReturnType<typeof createSeasonalResidualSeries>;
  intervals: ResidualInterval[];
}

/** Reuses interval estimation on residuals while retaining the original ES candidate identities. */
export const compareSeasonalResidualIntervals = (
  input: SeasonalReferenceInput,
  candidates: readonly Candidate[]
): ResidualIntervalComparison => {
  const series = createSeasonalResidualSeries(input);
  const unavailable = (reason: string): ResidualIntervalComparison => ({
    series,
    intervals: candidates.map(() => ({ status: 'unassessable', reason })),
  });
  if (series.status === 'unassessable') return unavailable(series.reason);
  if (series.counts.length < CHANGE_POINT_ANALYSIS_CONFIG.minCompleteBuckets) {
    return unavailable('insufficient-complete-residual-buckets');
  }

  const { startBucket, counts } = series;
  const points = candidates
    .filter((candidate) => candidate.startBucket >= startBucket)
    .map((candidate) => ({
      index: candidate.startBucket - startBucket,
      type: candidate.kind,
      pvalue: candidate.pvalue,
    }));
  // Interpret saved points locally; never send fractional or negative residuals to CHANGE_POINT.
  const interpreted = describeChangePointCandidates(
    counts,
    points,
    input.intervalMs,
    Date.parse(input.startTime) + startBucket * input.intervalMs
  );
  const byBucket = new Map(
    interpreted.candidates.map((candidate) => [candidate.startBucket + startBucket, candidate])
  );
  const intervals = candidates.map((original): ResidualInterval => {
    if (original.startBucket < startBucket) {
      return { status: 'unassessable', reason: 'fewer-than-three-preceding-cycles' };
    }
    if (!ACTIVITY_INCREASE_KINDS.some((kind) => kind === original.kind)) {
      return { status: 'unassessable', reason: 'not-an-upward-change-type' };
    }
    const candidate = byBucket.get(original.startBucket);
    if (!candidate) return { status: 'unassessable', reason: 'missing-residual-interpretation' };
    // The unchanged adapter needs six earlier residual buckets to extend a candidate.
    // A zero residual mean is valid for interval estimation, not for a percentage calculation.
    if (candidate.baseline === null) {
      return { status: 'unassessable', reason: 'insufficient-residual-reference-buckets' };
    }
    const endBucket = candidate.endBucket + startBucket;
    return {
      status: 'assessed',
      startBucket: original.startBucket,
      endBucket,
      residualReferenceMean: candidate.baseline,
      seasonalReference: measureSeasonalReference(input, {
        start: original.startBucket,
        end: endBucket,
      }),
    };
  });
  return { series, intervals };
};
