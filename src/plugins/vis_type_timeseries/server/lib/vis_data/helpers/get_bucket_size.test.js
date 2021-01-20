/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getBucketSize } from './get_bucket_size';

describe('getBucketSize', () => {
  const req = {
    payload: {
      timerange: {
        min: '2017-01-01T00:00:00.000Z',
        max: '2017-01-01T01:00:00.000Z',
      },
    },
  };

  test('returns auto calculated buckets', () => {
    const result = getBucketSize(req, 'auto', undefined, 100);

    expect(result).toHaveProperty('bucketSize', 30);
    expect(result).toHaveProperty('intervalString', '30s');
  });

  test('returns overridden buckets (1s)', () => {
    const result = getBucketSize(req, '1s', undefined, 100);

    expect(result).toHaveProperty('bucketSize', 1);
    expect(result).toHaveProperty('intervalString', '1s');
  });

  test('returns overridden buckets (10m)', () => {
    const result = getBucketSize(req, '10m', undefined, 100);

    expect(result).toHaveProperty('bucketSize', 600);
    expect(result).toHaveProperty('intervalString', '10m');
  });

  test('returns overridden buckets (1d)', () => {
    const result = getBucketSize(req, '1d', undefined, 100);

    expect(result).toHaveProperty('bucketSize', 86400);
    expect(result).toHaveProperty('intervalString', '1d');
  });

  test('returns overridden buckets (>=2d)', () => {
    const result = getBucketSize(req, '>=2d', undefined, 100);

    expect(result).toHaveProperty('bucketSize', 86400 * 2);
    expect(result).toHaveProperty('intervalString', '2d');
  });

  test('returns overridden buckets (>=10s)', () => {
    const result = getBucketSize(req, '>=10s', undefined, 100);

    expect(result).toHaveProperty('bucketSize', 30);
    expect(result).toHaveProperty('intervalString', '30s');
  });
});
