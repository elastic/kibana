/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBucketsPath } from './get_buckets_path';
import type { Metric } from '../../../../common/types';

describe('getBucketsPath', () => {
  const metrics = [
    { id: 1, type: 'derivative' },
    { id: 2, type: 'percentile', percentiles: [{ value: '50' }] },
    { id: 3, type: 'percentile', percentiles: [{ value: '20.0' }, { value: '10.0' }] },
    { id: 4, type: 'std_deviation', mode: 'raw' },
    { id: 5, type: 'std_deviation', mode: 'upper' },
    { id: 6, type: 'std_deviation', mode: 'lower' },
    { id: 7, type: 'sum_of_squares' },
    { id: 8, type: 'variance' },
    { id: 9, type: 'max' },
  ] as unknown as Metric[];

  test('return path for derivative', () => {
    expect(getBucketsPath('1', metrics)).toEqual('1[normalized_value]');
  });

  test('return path for percentile(50)', () => {
    expect(getBucketsPath('2', metrics)).toEqual('2[50.0]');
  });

  test('return path for percentile(20.0)', () => {
    expect(getBucketsPath('3', metrics)).toEqual('3[20.0]');
  });

  test('return path for percentile(10.0) with alt id', () => {
    expect(getBucketsPath('3[10.0]', metrics)).toEqual('3[10.0]');
  });

  test('return path for std_deviation(raw)', () => {
    expect(getBucketsPath('4', metrics)).toEqual('4[std_deviation]');
  });

  test('return path for std_deviation(upper)', () => {
    expect(getBucketsPath('5', metrics)).toEqual('5[std_upper]');
  });

  test('return path for std_deviation(lower)', () => {
    expect(getBucketsPath('6', metrics)).toEqual('6[std_lower]');
  });

  test('return path for sum_of_squares', () => {
    expect(getBucketsPath('7', metrics)).toEqual('7[sum_of_squares]');
  });

  test('return path for variance', () => {
    expect(getBucketsPath('8', metrics)).toEqual('8[variance]');
  });

  test('return path for basic metric', () => {
    expect(getBucketsPath('9', metrics)).toEqual('9');
  });
});
