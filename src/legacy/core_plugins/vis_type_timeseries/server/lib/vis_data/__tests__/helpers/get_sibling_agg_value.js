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
import { getSiblingAggValue } from '../../helpers/get_sibling_agg_value';

describe('getSiblingAggValue', () => {
  const row = {
    test: {
      max: 3,
      std_deviation: 1.5,
      std_deviation_bounds: {
        upper: 2,
        lower: 1,
      },
    },
  };

  it('returns the value for std_deviation_bounds.upper', () => {
    const metric = { id: 'test', type: 'std_deviation_bucket', mode: 'upper' };
    expect(getSiblingAggValue(row, metric)).to.equal(2);
  });

  it('returns the value for std_deviation_bounds.lower', () => {
    const metric = { id: 'test', type: 'std_deviation_bucket', mode: 'lower' };
    expect(getSiblingAggValue(row, metric)).to.equal(1);
  });

  it('returns the value for std_deviation', () => {
    const metric = { id: 'test', type: 'std_deviation_bucket', mode: 'raw' };
    expect(getSiblingAggValue(row, metric)).to.equal(1.5);
  });

  it('returns the value for basic (max)', () => {
    const metric = { id: 'test', type: 'max_bucket' };
    expect(getSiblingAggValue(row, metric)).to.equal(3);
  });
});
