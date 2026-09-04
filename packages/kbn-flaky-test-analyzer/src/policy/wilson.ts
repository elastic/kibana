/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** z-score for a 95% one-sided-ish confidence bound. */
export const DEFAULT_CONFIDENCE_Z = 1.96;

/**
 * Lower bound of the Wilson score interval for a binomial proportion.
 *
 * Used instead of the raw `failures / trials` rate so that a small sample must show a much
 * higher observed rate to clear the same threshold. This removes the need for a hand-picked
 * minimum-sample gate, which measurement showed to be simultaneously inert (the smallest real
 * sample is in the hundreds) and far too low to be meaningful (at a true 3% rate, 50 samples
 * give a 95% interval of roughly 0–7.7%).
 *
 * `trials` must be build counts, not test-run counts: runs within one build are not independent,
 * since a stack that fails to boot fails every test in the file at once.
 */
export const wilsonLowerBound = (
  failures: number,
  trials: number,
  z: number = DEFAULT_CONFIDENCE_Z
): number => {
  if (trials <= 0 || failures <= 0) {
    return 0;
  }

  const observed = Math.min(failures, trials) / trials;
  const denominator = 1 + (z * z) / trials;
  const centre = (observed + (z * z) / (2 * trials)) / denominator;
  const halfWidth =
    (z / denominator) *
    Math.sqrt((observed * (1 - observed)) / trials + (z * z) / (4 * trials * trials));

  return Math.max(0, centre - halfWidth);
};
