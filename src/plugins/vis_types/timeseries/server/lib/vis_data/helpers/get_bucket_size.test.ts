/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBucketSize } from './get_bucket_size';

import type { VisTypeTimeseriesVisDataRequest } from '../../../types';
import type { SearchCapabilities } from '../../search_strategies';

describe('getBucketSize', () => {
  const req = {
    body: {
      timerange: {
        min: '2017-01-01T00:00:00.000Z',
        max: '2017-07-01T01:00:00.000Z',
      },
    },
  } as VisTypeTimeseriesVisDataRequest;

  const capabilities = {
    timezone: 'UTC',
    maxBucketsLimit: 200000,
    getValidTimeInterval: jest.fn((v) => v),
  } as unknown as SearchCapabilities;

  test('returns auto calculated buckets', () => {
    const result = getBucketSize(req, 'auto', capabilities, 100);
    const expectedValue = 86400; // 24h

    expect(result).toHaveProperty('bucketSize', expectedValue);
    expect(result).toHaveProperty('intervalString', `${expectedValue}s`);
  });

  test('returns overridden buckets (1s)', () => {
    const result = getBucketSize(req, '1s', capabilities, 100);

    expect(result).toHaveProperty('bucketSize', 1);
    expect(result).toHaveProperty('intervalString', '1s');
  });

  test('returns overridden buckets (10m)', () => {
    const result = getBucketSize(req, '10m', capabilities, 100);

    expect(result).toHaveProperty('bucketSize', 600);
    expect(result).toHaveProperty('intervalString', '10m');
  });

  test('returns overridden buckets (1d)', () => {
    const result = getBucketSize(req, '1d', capabilities, 100);

    expect(result).toHaveProperty('bucketSize', 86400);
    expect(result).toHaveProperty('intervalString', '1d');
  });

  test('returns overridden buckets (>=2d)', () => {
    const result = getBucketSize(req, '>=2d', capabilities, 1000);

    expect(result).toHaveProperty('bucketSize', 86400 * 2);
    expect(result).toHaveProperty('intervalString', '2d');
  });

  test('returns overridden buckets (>=5d)', () => {
    const result = getBucketSize(req, '>=5d', capabilities, 100);

    expect(result).toHaveProperty('bucketSize', 432000);
    expect(result).toHaveProperty('intervalString', '5d');
  });

  test('returns overridden buckets for 1 bar and >=1d interval', () => {
    const result = getBucketSize(req, '>=1d', capabilities, 1);

    expect(result).toHaveProperty('bucketSize', 2592000);
    expect(result).toHaveProperty('intervalString', '2592000s');
  });
});
