/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getAllowedRegressionDeltaBytes,
  isMemoryRegression,
  MIN_REGRESSION_DELTA_BYTES,
} from './memory_regression_threshold';

describe('getAllowedRegressionDeltaBytes', () => {
  it('uses the fixed 150 MiB floor for small baselines', () => {
    const baselineMedianRssBytes = 500 * 1024 * 1024;

    expect(getAllowedRegressionDeltaBytes(baselineMedianRssBytes)).toBe(MIN_REGRESSION_DELTA_BYTES);
  });

  it('uses 8% of the baseline median when that exceeds 150 MiB', () => {
    const baselineMedianRssBytes = 3 * 1024 * 1024 * 1024;

    expect(getAllowedRegressionDeltaBytes(baselineMedianRssBytes)).toBe(
      baselineMedianRssBytes * 0.08
    );
  });
});

describe('isMemoryRegression', () => {
  it('returns false when the target delta is within the allowed threshold', () => {
    const baselineMedianRssBytes = 2 * 1024 * 1024 * 1024;
    const allowedDeltaBytes = getAllowedRegressionDeltaBytes(baselineMedianRssBytes);

    expect(
      isMemoryRegression(baselineMedianRssBytes, baselineMedianRssBytes + allowedDeltaBytes - 1)
    ).toBe(false);
  });

  it('returns true when the target delta exceeds the allowed threshold', () => {
    const baselineMedianRssBytes = 2 * 1024 * 1024 * 1024;
    const allowedDeltaBytes = getAllowedRegressionDeltaBytes(baselineMedianRssBytes);

    expect(
      isMemoryRegression(baselineMedianRssBytes, baselineMedianRssBytes + allowedDeltaBytes + 1)
    ).toBe(true);
  });
});
