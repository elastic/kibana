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

import expect from 'expect.js';
import { any } from '../any';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('any', () => {
  const fn = functionWrapper(any);

  it('should return false with no conditions', () => {
    expect(fn(null, {})).to.be(false);
    expect(fn(null, { condition: [] })).to.be(false);
  });

  it('should return false when no conditions are true', () => {
    expect(fn(null, null, { condition: [false] })).to.be(false);
    expect(fn(null, { condition: [false, false, false] })).to.be(false);
  });

  it('should return false when all conditions are falsy', () => {
    expect(fn(null, { condition: [false, 0, '', null] })).to.be(false);
  });

  it('should return true when at least one condition is true', () => {
    expect(fn(null, { condition: [false, false, true] })).to.be(true);
    expect(fn(null, { condition: [false, true, true] })).to.be(true);
    expect(fn(null, { condition: [true, true, true] })).to.be(true);
  });

  it('should return true when at least one condition is truthy', () => {
    expect(fn(null, { condition: [false, 0, '', null, 1] })).to.be(true);
    expect(fn(null, { condition: [false, 0, 'hooray', null] })).to.be(true);
    expect(fn(null, { condition: [false, 0, {}, null] })).to.be(true);
  });
});
