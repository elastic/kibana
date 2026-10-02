/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMaximumIntervalScore, type ActivitySeriesKind } from './interval_score';

export type IntervalCalibration =
  | { readonly status: 'ready'; readonly maxima: readonly number[] }
  | { readonly status: 'stopped'; readonly replicates: number; readonly exceeding: number }
  | {
      readonly status: 'unassessable';
      readonly reason: 'no-calibratable-intervals';
      readonly failedReplicate: number;
    };

export interface IntervalCalibrationOptions {
  readonly references: readonly (readonly number[])[];
  readonly random: () => number;
  readonly replicates: number;
  readonly profileReferences: number;
  readonly blocks: number;
  readonly kind?: ActivitySeriesKind;
  /** Stops as soon as p = (1 + #{maximum ≥ score}) / (replicates + 1) can no longer be ≤ alpha. */
  readonly stopAbove?: { readonly score: number; readonly alpha: number };
}

/** Aligned block boundaries whose sizes differ by at most one bucket (eight each for 48 buckets and six blocks). */
export const getCalibrationBlocks = (bucketCount: number, blocks: number): number[] =>
  Array.from({ length: blocks + 1 }, (_, index) => Math.floor((index * bucketCount) / blocks));

/** Builds the null distribution of the maximum interval score from pseudo-days of aligned reference blocks. */
export const calibrateIntervalScores = ({
  references,
  random,
  replicates,
  profileReferences,
  blocks,
  kind = 'counts',
  stopAbove,
}: IntervalCalibrationOptions): IntervalCalibration => {
  const bucketCount = references[0]?.length ?? 0;
  const boundaries = getCalibrationBlocks(bucketCount, blocks);
  const maxima: number[] = [];
  const days = Array.from({ length: profileReferences + 1 }, () =>
    new Array<number>(bucketCount).fill(0)
  );
  const profile = days.slice(0, profileReferences);
  let exceeding = 0;

  for (let replicate = 0; replicate < replicates; replicate++) {
    // Reuse the buffers, keeping the same day/block draw order as the frozen detector.
    for (const counts of days) {
      for (let block = 0; block < blocks; block++) {
        const draw = random();
        if (!Number.isFinite(draw) || draw < 0 || draw >= 1) throw new Error('Invalid random draw');
        const donor = references[Math.floor(draw * references.length)];
        for (let bucket = boundaries[block]; bucket < boundaries[block + 1]; bucket++) {
          counts[bucket] = donor[bucket];
        }
      }
    }

    const maximum = getMaximumIntervalScore(days[profileReferences], profile, kind);
    // An undefined maximum is never replaced by zero, skipped or redrawn.
    if (maximum === null) {
      return {
        status: 'unassessable',
        reason: 'no-calibratable-intervals',
        failedReplicate: replicate + 1,
      };
    }
    maxima.push(maximum);
    if (stopAbove && maximum >= stopAbove.score) {
      exceeding++;
      if ((1 + exceeding) / (replicates + 1) > stopAbove.alpha) {
        return { status: 'stopped', replicates: replicate + 1, exceeding };
      }
    }
  }

  return { status: 'ready', maxima };
};
