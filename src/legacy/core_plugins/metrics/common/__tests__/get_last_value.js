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
import getLastValue from '../get_last_value';

describe('getLastValue(data)', () => {

  it('returns data if data is not array', () => {
    expect(getLastValue('foo')).to.equal('foo');
  });

  it('returns the last value', () => {
    const data = [[1, 1]];
    expect(getLastValue(data)).to.equal(1);
  });

  it('returns the second to last value if the last value is null (default)', () => {
    const data = [[1, 4], [2, null]];
    expect(getLastValue(data)).to.equal(4);
  });

  it('returns 0 if second to last is not defined (default)', () => {
    const data = [[1, null], [2, null]];
    expect(getLastValue(data)).to.equal(0);
  });

  it('returns the N to last value if the last N-1 values are null (default)', () => {
    const data = [[1, 4], [2, null], [3, null]];
    expect(getLastValue(data, 3)).to.equal(4);
  });
});

