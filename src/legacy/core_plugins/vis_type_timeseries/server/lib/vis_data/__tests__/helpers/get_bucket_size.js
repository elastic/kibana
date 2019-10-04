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
import { getBucketSize } from '../../helpers/get_bucket_size';

describe('getBucketSize', () => {
  const req = {
    payload: {
      timerange: {
        min: '2017-01-01T00:00:00.000Z',
        max: '2017-01-01T01:00:00.000Z',
      },
    },
  };

  it('returns auto calculated buckets', () => {
    const result = getBucketSize(req, 'auto');
    expect(result).to.have.property('bucketSize', 30);
    expect(result).to.have.property('intervalString', '30s');
  });

  it('returns overridden buckets (1s)', () => {
    const result = getBucketSize(req, '1s');
    expect(result).to.have.property('bucketSize', 1);
    expect(result).to.have.property('intervalString', '1s');
  });

  it('returns overridden buckets (10m)', () => {
    const result = getBucketSize(req, '10m');
    expect(result).to.have.property('bucketSize', 600);
    expect(result).to.have.property('intervalString', '10m');
  });

  it('returns overridden buckets (1d)', () => {
    const result = getBucketSize(req, '1d');
    expect(result).to.have.property('bucketSize', 86400);
    expect(result).to.have.property('intervalString', '1d');
  });

  it('returns overridden buckets (>=2d)', () => {
    const result = getBucketSize(req, '>=2d');
    expect(result).to.have.property('bucketSize', 86400 * 2);
    expect(result).to.have.property('intervalString', '2d');
  });

  it('returns overridden buckets (>=10s)', () => {
    const result = getBucketSize(req, '>=10s');
    expect(result).to.have.property('bucketSize', 30);
    expect(result).to.have.property('intervalString', '30s');
  });
});
