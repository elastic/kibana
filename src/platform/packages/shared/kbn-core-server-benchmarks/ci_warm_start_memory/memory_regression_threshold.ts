/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MIN_REGRESSION_DELTA_BYTES = 150 * 1024 * 1024;
export const RELATIVE_REGRESSION_DELTA_RATIO = 0.08;

export const getAllowedRegressionDeltaBytes = (baselineMedianRssBytes: number): number => {
  return Math.max(MIN_REGRESSION_DELTA_BYTES, baselineMedianRssBytes * RELATIVE_REGRESSION_DELTA_RATIO);
};

export const isMemoryRegression = (
  baselineMedianRssBytes: number,
  targetMedianRssBytes: number
): boolean => {
  const deltaBytes = targetMedianRssBytes - baselineMedianRssBytes;
  return deltaBytes > getAllowedRegressionDeltaBytes(baselineMedianRssBytes);
};
