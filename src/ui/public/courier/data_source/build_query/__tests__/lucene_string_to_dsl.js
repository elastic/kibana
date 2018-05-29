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

import { luceneStringToDsl } from '../lucene_string_to_dsl';
import { expectDeepEqual } from '../../../../../../test_utils/expect_deep_equal.js';
import expect from 'expect.js';

describe('build query', function () {

  describe('luceneStringToDsl', function () {

    it('should wrap strings with an ES query_string query', function () {
      const result = luceneStringToDsl('foo:bar');
      const expectedResult = {
        query_string: { query: 'foo:bar' }
      };
      expectDeepEqual(result, expectedResult);
    });

    it('should return a match_all query for empty strings and whitespace', function () {
      const expectedResult = {
        match_all: {}
      };

      expectDeepEqual(luceneStringToDsl(''), expectedResult);
      expectDeepEqual(luceneStringToDsl('   '), expectedResult);
    });

    it('should return non-string arguments without modification', function () {
      const expectedResult = {};
      const result = luceneStringToDsl(expectedResult);
      expect(result).to.be(expectedResult);
      expectDeepEqual(result, expectedResult);
    });

  });

});
