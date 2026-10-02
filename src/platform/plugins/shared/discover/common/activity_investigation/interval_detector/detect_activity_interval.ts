/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACTIVITY_INCREASE_SELECTION_CONFIG } from '../activity_increase';
import { calibrateIntervalScores, getCalibrationBlocks } from './calibration';
import {
  getInternalIntervalCandidates,
  type ActivityInterval,
  type InternalIntervalCandidate,
} from './internal_reference';
import {
  createIntervalScorer,
  isValidActivitySeries,
  type ActivitySeriesKind,
  type IntervalScore,
} from './interval_score';

export const ACTIVITY_INTERVAL_DETECTOR_CONFIG = {
  version: 'activity-interval-b-1',
  referenceCount: 6,
  profileReferences: 3,
  replicates: 999,
  calibrationBlocks: 6,
  // The validated grid: 48 half-hour buckets. Other grids keep the same proportions in buckets.
  nominalBucketMs: 1_800_000,
  minReferenceBuckets: 6,
  minRelativeIncrease: ACTIVITY_INCREASE_SELECTION_CONFIG.minRelativeIncrease,
  alpha: 0.05,
} as const;

export interface HistoricalIntervalCandidate extends InternalIntervalCandidate {
  readonly historical: (IntervalScore & { readonly p: number }) | null;
}

export interface ActivityIntervalDecision {
  readonly alpha: number;
  readonly status: 'admitted' | 'none' | 'unassessable-history';
  readonly admittedCandidates: number;
  readonly selected: HistoricalIntervalCandidate | null;
}

export type ActivityIntervalDetection =
  | {
      readonly status: 'admitted';
      readonly interval: ActivityInterval;
      readonly candidate: HistoricalIntervalCandidate;
      readonly alpha: number;
      readonly p: number;
      readonly replicates: number;
      readonly version: string;
    }
  | {
      readonly status: 'none';
      readonly alpha: number;
      /** Smallest p among the candidates when every replicate ran; null without assessable candidates. */
      readonly p: number | null;
      /** Set when the calibration stopped early: p is known only to exceed alpha. */
      readonly stoppedAfterReplicates?: number;
      readonly version: string;
    }
  | {
      readonly status: 'unassessable';
      readonly reason: 'no-calibratable-intervals' | 'no-historical-level';
      readonly version: string;
    };

const assertAlpha = (alpha: number): void => {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error('Expected alpha strictly between 0 and 1');
  }
};

const empiricalRank = (score: number, sorted: readonly number[]): number => {
  let left = 0;
  let right = sorted.length;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (sorted[middle] < score) left = middle + 1;
    else right = middle;
  }

  return (1 + sorted.length - left) / (sorted.length + 1);
};

const scoreCandidates = (
  current: readonly number[],
  profileReferences: readonly (readonly number[])[],
  kind: ActivitySeriesKind
): HistoricalIntervalCandidate[] => {
  const { candidates } = getInternalIntervalCandidates(current, ACTIVITY_INTERVAL_DETECTOR_CONFIG);
  const scorer = createIntervalScorer(current, profileReferences, kind);

  return candidates.map((candidate) => {
    const fit = scorer(candidate.start, candidate.end);

    return { ...candidate, historical: fit ? { ...fit, p: Number.NaN } : null };
  });
};

// Highest score; equal scores go to the earlier start, then the longer interval.
const selectByScore = (
  candidates: readonly HistoricalIntervalCandidate[],
  alpha: number
): HistoricalIntervalCandidate | null => {
  let selected: HistoricalIntervalCandidate | null = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const { historical, start, end } = candidate;
    if (!historical || historical.p > alpha) continue;
    if (
      !selected ||
      historical.score > bestScore ||
      (historical.score === bestScore &&
        (start < selected.start || (start === selected.start && end > selected.end)))
    ) {
      selected = candidate;
      bestScore = historical.score;
    }
  }

  return selected;
};

/** Admits internal candidates by their calibrated historical score and selects the highest score, per alpha. */
export const assessActivityIntervals = (
  current: readonly number[],
  profileReferences: readonly (readonly number[])[],
  maxima: readonly number[],
  alphas: readonly number[],
  kind: ActivitySeriesKind = 'counts'
): { candidates: HistoricalIntervalCandidate[]; decisions: ActivityIntervalDecision[] } => {
  if (
    maxima.length !== ACTIVITY_INTERVAL_DETECTOR_CONFIG.replicates ||
    maxima.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error('Incomplete or invalid calibration');
  }
  alphas.forEach(assertAlpha);
  const sorted = [...maxima].sort((left, right) => left - right);
  const candidates = scoreCandidates(current, profileReferences, kind).map((candidate) =>
    candidate.historical
      ? {
          ...candidate,
          historical: {
            ...candidate.historical,
            p: empiricalRank(candidate.historical.score, sorted),
          },
        }
      : candidate
  );
  const historicallyAssessable = candidates.some(({ historical }) => historical !== null);

  return {
    candidates,
    decisions: alphas.map((alpha) => {
      const admitted = candidates.filter(
        ({ historical }) => historical !== null && historical.p <= alpha
      );

      return {
        alpha,
        status:
          candidates.length && !historicallyAssessable
            ? 'unassessable-history'
            : admitted.length
            ? 'admitted'
            : 'none',
        admittedCandidates: admitted.length,
        selected: selectByScore(candidates, alpha),
      };
    }),
  };
};

/**
 * Finds the interval of the view that rises above its internal reference and holds an unusually large share of the
 * view against history (B); it does not guarantee a level above the usual one.
 */
export const detectActivityInterval = ({
  current,
  references,
  random,
  alpha = ACTIVITY_INTERVAL_DETECTOR_CONFIG.alpha,
  earlyStop = false,
  kind = 'counts',
}: {
  readonly current: readonly number[];
  /** Six comparable windows of the same grid, most recent first. */
  readonly references: readonly (readonly number[])[];
  readonly random: () => number;
  readonly alpha?: number;
  readonly earlyStop?: boolean;
  /** `sums` (per-bucket sums of a nonnegative numeric field) is an extension beyond the validated B. */
  readonly kind?: ActivitySeriesKind;
}): ActivityIntervalDetection => {
  const { version, referenceCount, profileReferences, replicates, calibrationBlocks } =
    ACTIVITY_INTERVAL_DETECTOR_CONFIG;
  const bucketCount = current.length;
  if (
    bucketCount < 2 ||
    references.length !== referenceCount ||
    [current, ...references].some((values) => !isValidActivitySeries(values, bucketCount, kind))
  ) {
    throw new Error('Expected complete nonnegative counts for the view and six references');
  }
  assertAlpha(alpha);
  const profile = references.slice(0, profileReferences);
  const candidates = scoreCandidates(current, profile, kind);
  const scores = candidates.flatMap(({ historical }) => (historical ? [historical.score] : []));
  // With events in every calibration block of every reference, each pseudo-day has events in every block, so the
  // first block always has a usual level on both sides and the calibration cannot become unassessable: stopping
  // early then preserves the status as well as the decision. Otherwise the full calibration runs, as in B.
  const boundaries = getCalibrationBlocks(bucketCount, calibrationBlocks);
  const stopEarly =
    earlyStop &&
    references.every((reference) =>
      boundaries
        .slice(1)
        .every(
          (end, block) =>
            reference.slice(boundaries[block], end).reduce((sum, value) => sum + value, 0) > 0
        )
    );

  if (stopEarly && !scores.length) {
    return candidates.length
      ? { status: 'unassessable', reason: 'no-historical-level', version }
      : { status: 'none', alpha, p: null, version };
  }
  const calibration = calibrateIntervalScores({
    references,
    random,
    replicates,
    profileReferences,
    blocks: calibrationBlocks,
    kind,
    stopAbove: stopEarly ? { score: Math.max(...scores), alpha } : undefined,
  });
  if (calibration.status === 'unassessable') {
    return { status: 'unassessable', reason: calibration.reason, version };
  }
  if (calibration.status === 'stopped') {
    return {
      status: 'none',
      alpha,
      p: null,
      stoppedAfterReplicates: calibration.replicates,
      version,
    };
  }
  const assessed = assessActivityIntervals(current, profile, calibration.maxima, [alpha], kind);
  const [decision] = assessed.decisions;
  if (decision.status === 'unassessable-history') {
    return { status: 'unassessable', reason: 'no-historical-level', version };
  }
  if (decision.selected?.historical) {
    return {
      status: 'admitted',
      interval: { start: decision.selected.start, end: decision.selected.end },
      candidate: decision.selected,
      alpha,
      p: decision.selected.historical.p,
      replicates,
      version,
    };
  }
  const pValues = assessed.candidates.flatMap(({ historical }) =>
    historical ? [historical.p] : []
  );

  return { status: 'none', alpha, p: pValues.length ? Math.min(...pValues) : null, version };
};
