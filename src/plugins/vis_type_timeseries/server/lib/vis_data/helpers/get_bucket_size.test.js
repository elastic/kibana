/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
    const result = getBucketSize(req, 'auto');
    expect(result).toHaveProperty('bucketSize', 30);
    expect(result).toHaveProperty('intervalString', '30s');
  });

  test('returns overridden buckets (1s)', () => {
    const result = getBucketSize(req, '1s');
    expect(result).toHaveProperty('bucketSize', 1);
    expect(result).toHaveProperty('intervalString', '1s');
  });

  test('returns overridden buckets (10m)', () => {
    const result = getBucketSize(req, '10m');
    expect(result).toHaveProperty('bucketSize', 600);
    expect(result).toHaveProperty('intervalString', '10m');
  });

  test('returns overridden buckets (1d)', () => {
    const result = getBucketSize(req, '1d');
    expect(result).toHaveProperty('bucketSize', 86400);
    expect(result).toHaveProperty('intervalString', '1d');
  });

  test('returns overridden buckets (>=2d)', () => {
    const result = getBucketSize(req, '>=2d');
    expect(result).toHaveProperty('bucketSize', 86400 * 2);
    expect(result).toHaveProperty('intervalString', '2d');
  });

  test('returns overridden buckets (>=10s)', () => {
    const result = getBucketSize(req, '>=10s');
    expect(result).toHaveProperty('bucketSize', 30);
    expect(result).toHaveProperty('intervalString', '30s');
  });
});
