/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MIN_VALID_WARM_START_MEMORY_PAIRS = 4;

// Heap growth exceeding 5 MiB is undesirable and should be exceptional for a PR.
// Post-forced-GC calibration showed paired-delta SD of 0.5-1.5 MiB, so at the
// default of four pairs the decision margin is an order of magnitude; the
// paired mean alone is the decision statistic. SD and standard error are kept
// in the report to detect noise-floor regressions in the instrumentation.
export const WARM_START_MEMORY_THRESHOLD_BYTES = 5 * 1024 * 1024;

export interface PairedMemoryRuleResult {
  readonly pairCount: number;
  readonly meanBytes?: number;
  readonly sampleStandardDeviationBytes?: number;
  readonly standardErrorBytes?: number;
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

  return {
    pairCount: deltas.length,
    meanBytes,
    sampleStandardDeviationBytes,
    standardErrorBytes,
    thresholdBytes: WARM_START_MEMORY_THRESHOLD_BYTES,
  };
};
