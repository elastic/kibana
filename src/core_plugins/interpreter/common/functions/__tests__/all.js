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
import { all } from '../all';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('all', () => {
  const fn = functionWrapper(all);

  it('should return true with no conditions', () => {
    expect(fn(null, {})).to.be(true);
    expect(fn(null, { condition: [] })).to.be(true);
  });

  it('should return true when all conditions are true', () => {
    expect(fn(null, { condition: [true] })).to.be(true);
    expect(fn(null, { condition: [true, true, true] })).to.be(true);
  });

  it('should return true when all conditions are truthy', () => {
    expect(fn(null, { condition: [true, 1, 'hooray', {}] })).to.be(true);
  });

  it('should return false when at least one condition is false', () => {
    expect(fn(null, { condition: [false, true, true] })).to.be(false);
    expect(fn(null, { condition: [false, false, true] })).to.be(false);
    expect(fn(null, { condition: [false, false, false] })).to.be(false);
  });

  it('should return false when at least one condition is falsy', () => {
    expect(fn(null, { condition: [true, 0, 'hooray', {}] })).to.be(false);
    expect(fn(null, { condition: [true, 1, 'hooray', null] })).to.be(false);
    expect(fn(null, { condition: [true, 1, '', {}] })).to.be(false);
  });
});
