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
import { string } from '../string';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('string', () => {
  const fn = functionWrapper(string);

  it('casts primitive types to strings', () => {
    expect(fn(null, { value: [14000] })).to.be('14000');
    expect(fn(null, { value: ['foo'] })).to.be('foo');
    expect(fn(null, { value: [null] })).to.be('');
    expect(fn(null, { value: [true] })).to.be('true');
  });

  it('concatenates all args to one string', () => {
    expect(fn(null, { value: ['foo', 'bar', 'fizz', 'buzz'] })).to.be('foobarfizzbuzz');
    expect(fn(null, { value: ['foo', 1, true, null] })).to.be('foo1true');
  });
});
