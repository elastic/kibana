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

import { expect } from 'chai';
import { getBucketsPath } from '../../helpers/get_buckets_path';

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

  it('return path for derivative', () => {
    expect(getBucketsPath(1, metrics)).to.equal('1[normalized_value]');
  });

  it('return path for percentile(50)', () => {
    expect(getBucketsPath(2, metrics)).to.equal('2[50.0]');
  });

  it('return path for percentile(20.0)', () => {
    expect(getBucketsPath(3, metrics)).to.equal('3[20.0]');
  });

  it('return path for percentile(10.0) with alt id', () => {
    expect(getBucketsPath('3[10.0]', metrics)).to.equal('3[10.0]');
  });

  it('return path for std_deviation(raw)', () => {
    expect(getBucketsPath(4, metrics)).to.equal('4[std_deviation]');
  });

  it('return path for std_deviation(upper)', () => {
    expect(getBucketsPath(5, metrics)).to.equal('5[std_upper]');
  });

  it('return path for std_deviation(lower)', () => {
    expect(getBucketsPath(6, metrics)).to.equal('6[std_lower]');
  });

  it('return path for sum_of_squares', () => {
    expect(getBucketsPath(7, metrics)).to.equal('7[sum_of_squares]');
  });

  it('return path for variance', () => {
    expect(getBucketsPath(8, metrics)).to.equal('8[variance]');
  });

  it('return path for basic metric', () => {
    expect(getBucketsPath(9, metrics)).to.equal('9');
  });
});
