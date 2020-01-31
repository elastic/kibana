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

import { buildQueryFilter } from '../query';
import { cloneDeep } from 'lodash';
import expect from '@kbn/expect';
import indexPattern from '../../__fixtures__/index_pattern_response.json';
import filterSkeleton from '../../__fixtures__/filter_skeleton';

let expected;

describe('Filter Manager', function() {
  describe('Phrase filter builder', function() {
    beforeEach(() => {
      expected = cloneDeep(filterSkeleton);
    });

    it('should be a function', function() {
      expect(buildQueryFilter).to.be.a(Function);
    });

    it('should return a query filter when passed a standard field', function() {
      expected.query = {
        foo: 'bar',
      };
      expect(buildQueryFilter({ foo: 'bar' }, indexPattern.id)).to.eql(expected);
    });
  });
});
