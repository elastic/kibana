/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MIN_VALID_WARM_START_MEMORY_PAIRS = 6;

// Heap growth exceeding 5 MiB is undesirable and should be exceptional for a PR.
export const WARM_START_MEMORY_THRESHOLD_BYTES = 5 * 1024 * 1024;
export const WARM_START_MEMORY_CONFIDENCE = 0.99;

// One-sided 99% Student-t critical values for df 1..30.
//
// Each value is the 0.99 quantile of Student's t distribution:
// P(T_df <= tCritical) = 0.99.
// Reference: https://en.wikipedia.org/wiki/Student%27s_t-distribution#Quantiles
//
// The benchmark uses eight pairs by default (df 7); values above the table use
// the conservative df=30 value rather than silently using a normal approximation.
const ONE_SIDED_99_T_CRITICAL = [
  31.8205, 6.9646, 4.5407, 3.7469, 3.3649, 3.1427, 2.9979, 2.8965, 2.8214, 2.7638, 2.7181, 2.681,
  2.6503, 2.6245, 2.6025, 2.5835, 2.5669, 2.5524, 2.5395, 2.5274, 2.5176, 2.5083, 2.5, 2.4922,
  2.4851, 2.4786, 2.4727, 2.4671, 2.462, 2.4573,
];

export interface PairedMemoryRuleResult {
  readonly pairCount: number;
  readonly meanBytes?: number;
  readonly sampleStandardDeviationBytes?: number;
  readonly standardErrorBytes?: number;
  readonly tCritical?: number;
  readonly lowerConfidenceBoundBytes?: number;
  readonly thresholdBytes: number;
}

export const evaluatePairedMemoryRule = ({
  deltas,
}: {
  deltas: readonly number[];
}): PairedMemoryRuleResult => {
  if (deltas.length < MIN_VALID_WARM_START_MEMORY_PAIRS) {
    return { pairCount: deltas.length, thresholdBytes: WARM_START_MEMORY_THRESHOLD_BYTES };
  }

  const meanBytes = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
  const variance =
    deltas.reduce((sum, delta) => sum + (delta - meanBytes) ** 2, 0) / (deltas.length - 1);
  const sampleStandardDeviationBytes = Math.sqrt(variance);
  const standardErrorBytes = sampleStandardDeviationBytes / Math.sqrt(deltas.length);
  const tCritical = ONE_SIDED_99_T_CRITICAL[Math.min(deltas.length - 2, 29)];
  const lowerConfidenceBoundBytes = meanBytes - tCritical * standardErrorBytes;

  return {
    pairCount: deltas.length,
    meanBytes,
    sampleStandardDeviationBytes,
    standardErrorBytes,
    tCritical,
    lowerConfidenceBoundBytes,
    thresholdBytes: WARM_START_MEMORY_THRESHOLD_BYTES,
  };
};
