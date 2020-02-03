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

import { getBucketsPath } from './get_buckets_path';

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
  ];

  test('return path for derivative', () => {
    expect(getBucketsPath(1, metrics)).toEqual('1[normalized_value]');
  });

  test('return path for percentile(50)', () => {
    expect(getBucketsPath(2, metrics)).toEqual('2[50.0]');
  });

  test('return path for percentile(20.0)', () => {
    expect(getBucketsPath(3, metrics)).toEqual('3[20.0]');
  });

  test('return path for percentile(10.0) with alt id', () => {
    expect(getBucketsPath('3[10.0]', metrics)).toEqual('3[10.0]');
  });

  test('return path for std_deviation(raw)', () => {
    expect(getBucketsPath(4, metrics)).toEqual('4[std_deviation]');
  });

  test('return path for std_deviation(upper)', () => {
    expect(getBucketsPath(5, metrics)).toEqual('5[std_upper]');
  });

  test('return path for std_deviation(lower)', () => {
    expect(getBucketsPath(6, metrics)).toEqual('6[std_lower]');
  });

  test('return path for sum_of_squares', () => {
    expect(getBucketsPath(7, metrics)).toEqual('7[sum_of_squares]');
  });

  test('return path for variance', () => {
    expect(getBucketsPath(8, metrics)).toEqual('8[variance]');
  });

  test('return path for basic metric', () => {
    expect(getBucketsPath(9, metrics)).toEqual('9');
  });
});
