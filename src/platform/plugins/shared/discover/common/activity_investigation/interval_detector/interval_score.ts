/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { prefixSums } from './internal_reference';

export interface IntervalScore {
  readonly score: number;
  readonly expected: number;
  readonly insideMultiplier: number;
  readonly outsideMultiplier: number;
}

export type IntervalScorer = (start: number, end: number) => IntervalScore | null;

/** Event counts, or per-bucket sums of a numeric field (an extension beyond the validated B). */
export type ActivitySeriesKind = 'counts' | 'sums';

const median = (values: readonly number[]): number => {
  if (values.length === 3) {
    const [first, second, third] = values;
    return first < second
      ? Math.max(first, Math.min(second, third))
      : Math.max(second, Math.min(first, third));
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[middle] : sorted[middle - 1] / 2 + sorted[middle] / 2;
};

const likelihoodTerm = (count: number, expectation: number): number =>
  count === 0 ? 0 : count * Math.log(count / expectation);

/** Returns whether a series is complete and nonnegative: safe integers for counts, finite values for sums. */
export const isValidActivitySeries = (
  values: readonly number[],
  bucketCount: number,
  kind: ActivitySeriesKind = 'counts'
): boolean => {
  const total = values.reduce((sum, value) => sum + value, 0);

  return kind === 'counts'
    ? values.length === bucketCount &&
        values.every((value) => Number.isSafeInteger(value) && value >= 0) &&
        Number.isSafeInteger(total)
    : values.length === bucketCount &&
        values.every((value) => Number.isFinite(value) && value >= 0) &&
        Number.isFinite(total);
};

/** Scores intervals of the current counts against the median inside and outside totals of the references. */
export const createIntervalScorer = (
  current: readonly number[],
  references: readonly (readonly number[])[],
  kind: ActivitySeriesKind = 'counts'
): IntervalScorer => {
  const bucketCount = current.length;
  if (
    !references.length ||
    [current, ...references].some((values) => !isValidActivitySeries(values, bucketCount, kind))
  ) {
    throw new Error('Expected complete nonnegative current and reference counts on one grid');
  }
  const observed = prefixSums(current);
  const historical = references.map(prefixSums);
  const observedTotal = observed[bucketCount];
  const insideCounts = new Array<number>(references.length).fill(0);
  const outsideCounts = new Array<number>(references.length).fill(0);

  return (start, end) => {
    for (let index = 0; index < historical.length; index++) {
      const prefix = historical[index];
      insideCounts[index] = prefix[end] - prefix[start];
      outsideCounts[index] = prefix[bucketCount] - insideCounts[index];
    }
    const expectedInside = median(insideCounts);
    const expectedOutside = median(outsideCounts);
    // Separate aggregate medians are not additive across intervals; use this partition's total.
    const expectedTotal = expectedInside + expectedOutside;
    if (expectedInside <= 0 || expectedOutside <= 0) return null;
    const observedInside = observed[end] - observed[start];
    const observedOutside = observedTotal - observedInside;
    const insideMultiplier = observedInside / expectedInside;
    const outsideMultiplier = observedOutside / expectedOutside;
    const gain =
      likelihoodTerm(observedInside, expectedInside) +
      likelihoodTerm(observedOutside, expectedOutside) -
      likelihoodTerm(observedTotal, expectedTotal);
    if (!Number.isFinite(gain)) throw new Error('Nonfinite aggregate contrast');

    return {
      score: insideMultiplier > outsideMultiplier ? Math.max(0, gain) : 0,
      expected: expectedInside,
      insideMultiplier,
      outsideMultiplier,
    };
  };
};

/** Returns the highest score over every proper interval, or null when no interval has a usual level on both sides. */
export const getMaximumIntervalScore = (
  current: readonly number[],
  references: readonly (readonly number[])[],
  kind: ActivitySeriesKind = 'counts'
): number | null => {
  const scorer = createIntervalScorer(current, references, kind);
  const bucketCount = current.length;
  let maximum: number | null = null;

  for (let start = 0; start < bucketCount; start++) {
    for (let end = start + 1; end <= bucketCount; end++) {
      if (start === 0 && end === bucketCount) continue;
      const fit = scorer(start, end);
      if (fit) maximum = Math.max(maximum ?? 0, fit.score);
    }
  }

  return maximum;
};
