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
import { calculateBarWidth } from '../calculate_bar_width';

describe('calculateBarWidth(series, divisor, multiplier)', () => {
  it('returns default bar width', () => {
    const series = [{ data: [[100, 100], [200, 100]] }];
    expect(calculateBarWidth(series)).to.equal(70);
  });

  it('returns custom bar width', () => {
    const series = [{ data: [[100, 100], [200, 100]] }];
    expect(calculateBarWidth(series, 2)).to.equal(200);
  });
});
