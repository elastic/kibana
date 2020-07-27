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

import expect from '@kbn/expect';
import { hasPath } from '../';

describe(`Code Owners`, () => {
  describe(`hasPath predicate fn`, () => {
    const iterable = new Map();
    iterable.set('a', 'b');
    it(`should return true if the iterable has the path`, () => {
      expect(hasPath('a')(iterable)).to.be(true);
    });
    it(`should return false if the iterable does not have the path`, () => {
      expect(hasPath('b')(iterable)).to.be(false);
    });
  });
});
