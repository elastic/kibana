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
import { doFn } from '../do';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('do', () => {
  const fn = functionWrapper(doFn);

  it('should only pass context', () => {
    expect(fn(1, { fn: '1' })).to.equal(1);
    expect(fn(true, {})).to.equal(true);
    expect(fn(null, {})).to.equal(null);
    expect(fn(null, { fn: 'not null' })).to.equal(null);
  });
});
