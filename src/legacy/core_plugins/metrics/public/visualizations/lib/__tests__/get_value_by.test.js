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

import { getValueBy } from '../get_value_by';
import { expect } from 'chai';

describe('getValueBy(fn, data)', () => {
  it("returns max for getValueBy('max', data) ", () => {
    const data = [[0, 5], [1, 3], [2, 4], [3, 6], [4, 5]];
    expect(getValueBy('max', data)).to.equal(6);
  });
  it('returns 0 if data is not array', () => {
    const data = '1';
    expect(getValueBy('max', data)).to.equal(0);
  });
  it('returns value if data is number', () => {
    const data = 1;
    expect(getValueBy('max', data)).to.equal(1);
  });
});
