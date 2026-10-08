/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import buildTarget from './build_target';

describe('buildTarget', () => {
  const makeTlConfig = (
    interval,
    maxBuckets = 2000,
    from = '2026-01-01T00:00:00.000Z',
    to = '2026-01-01T01:00:00.000Z'
  ) => ({
    time: { from, to, interval, timezone: 'UTC' },
    settings: { 'timelion:max_buckets': maxBuckets },
  });

  test('generates correct number of buckets for 1h interval over 1 hour', () => {
    const result = buildTarget(makeTlConfig('1h'));
    expect(result.length).toBe(1);
  });

  test('generates correct number of buckets for 10m interval over 1 hour', () => {
    const result = buildTarget(makeTlConfig('10m'));
    expect(result.length).toBe(6);
  });

  test('returns timestamps in ascending order', () => {
    const result = buildTarget(makeTlConfig('15m'));
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });

  test('throws when target series exceeds max_buckets', () => {
    expect(() => buildTarget(makeTlConfig('1s', 10))).toThrow(/max_buckets/);
  });

  test('uses default max_buckets of 2000 when settings is missing', () => {
    const tlConfig = {
      time: {
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-01T01:00:00.000Z',
        interval: '1s',
        timezone: 'UTC',
      },
    };
    expect(() => buildTarget(tlConfig)).toThrow(/max_buckets.*2000/);
  });
});
