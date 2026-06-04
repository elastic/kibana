/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface MemoryRegressionThresholdPolicy {
  readonly minDeltaBytes: number;
  readonly relativeDeltaRatio: number;
}

export const MIN_TAIL_RSS_REGRESSION_DELTA_BYTES = 150 * 1024 * 1024; // 150MB
export const TAIL_RSS_RELATIVE_REGRESSION_DELTA_RATIO = 0.08;
export const MIN_MAX_RSS_REGRESSION_DELTA_BYTES = 300 * 1024 * 1024; // 300MB
export const MAX_RSS_RELATIVE_REGRESSION_DELTA_RATIO = 0.12;

export const TAIL_RSS_REGRESSION_THRESHOLD_POLICY: MemoryRegressionThresholdPolicy = {
  minDeltaBytes: MIN_TAIL_RSS_REGRESSION_DELTA_BYTES,
  relativeDeltaRatio: TAIL_RSS_RELATIVE_REGRESSION_DELTA_RATIO,
};

export const MAX_RSS_REGRESSION_THRESHOLD_POLICY: MemoryRegressionThresholdPolicy = {
  minDeltaBytes: MIN_MAX_RSS_REGRESSION_DELTA_BYTES,
  relativeDeltaRatio: MAX_RSS_RELATIVE_REGRESSION_DELTA_RATIO,
};

export const getAllowedRegressionDeltaBytes = (
  baselineMedianRssBytes: number,
  policy: MemoryRegressionThresholdPolicy = TAIL_RSS_REGRESSION_THRESHOLD_POLICY
): number => {
  return Math.max(policy.minDeltaBytes, baselineMedianRssBytes * policy.relativeDeltaRatio);
};

export const isMemoryRegression = (
  baselineMedianRssBytes: number,
  targetMedianRssBytes: number,
  policy: MemoryRegressionThresholdPolicy = TAIL_RSS_REGRESSION_THRESHOLD_POLICY
): boolean => {
  const deltaBytes = targetMedianRssBytes - baselineMedianRssBytes;
  return deltaBytes > getAllowedRegressionDeltaBytes(baselineMedianRssBytes, policy);
};
