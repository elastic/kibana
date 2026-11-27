/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LATENCY_MAP_ROWS, durationToRow } from '../query/duration_rows';
import type { DurationStats } from '../types';
import { findSlowestPercentile, getSlowestRange, percentileDuration } from './slowest';

const stats: DurationStats = {
  min: 100,
  p90: 5000,
  p95: 8000,
  p99: 10_000,
  max: 2_000_000,
  spans: 1000,
};
const size = { bins: 60, rows: LATENCY_MAP_ROWS };

describe('percentileDuration', () => {
  it('reads the percentile off the statistics', () => {
    expect(percentileDuration(stats, 90)).toBe(5000);
    expect(percentileDuration(stats, 95)).toBe(8000);
    expect(percentileDuration(stats, 99)).toBe(10_000);
  });
});

describe('getSlowestRange', () => {
  it('covers every column, from the row of the percentile to the top', () => {
    expect(getSlowestRange(stats, 95, size)).toEqual({
      x0: 0,
      x1: 60,
      y0: Math.floor(durationToRow(8000, stats)),
      y1: LATENCY_MAP_ROWS,
    });
  });

  it('starts a higher percentile on a higher row', () => {
    const [p90, p95, p99] = ([90, 95, 99] as const).map(
      (percentile) => getSlowestRange(stats, percentile, size).y0
    );
    expect(p90).toBeLessThan(p95);
    expect(p95).toBeLessThan(p99);
  });

  it('keeps a row to select when the percentile sits at the very top', () => {
    const { y0, y1 } = getSlowestRange({ ...stats, p99: stats.max }, 99, size);
    expect(y0).toBe(LATENCY_MAP_ROWS - 1);
    expect(y1).toBe(LATENCY_MAP_ROWS);
  });
});

describe('findSlowestPercentile', () => {
  it('names the shortcut whose range it is', () => {
    expect(findSlowestPercentile(getSlowestRange(stats, 95, size), stats, size)).toBe(95);
  });

  it('names none for any other range', () => {
    const slowest = getSlowestRange(stats, 95, size);
    expect(findSlowestPercentile({ ...slowest, x0: 1 }, stats, size)).toBeUndefined();
    expect(findSlowestPercentile({ ...slowest, y1: slowest.y1 - 1 }, stats, size)).toBeUndefined();
    expect(findSlowestPercentile({ ...slowest, y0: 0 }, stats, size)).toBeUndefined();
  });

  describe('when the percentiles coincide on the same rows', () => {
    const spike: DurationStats = { ...stats, p90: 10_000, p95: 10_000 };
    const range = getSlowestRange(spike, 90, size);

    it('names the highest percentile without a pick', () => {
      expect(findSlowestPercentile(range, spike, size)).toBe(99);
    });

    it('names the percentile the user picked', () => {
      expect(findSlowestPercentile(range, spike, size, 90)).toBe(90);
    });

    it('ignores a pick that the range is not', () => {
      expect(findSlowestPercentile(getSlowestRange(stats, 99, size), stats, size, 90)).toBe(99);
    });
  });
});
