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
import { buildQueryFromFilters } from '../from_filters';

describe('build query', function() {
  describe('buildQueryFromFilters', function() {
    it('should return the parameters of an Elasticsearch bool query', function() {
      const result = buildQueryFromFilters([]);
      const expected = {
        must: [],
        filter: [],
        should: [],
        must_not: [],
      };
      expect(result).to.eql(expected);
    });

    it('should transform an array of kibana filters into ES queries combined in the bool clauses', function() {
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all' },
        },
        {
          exists: { field: 'foo' },
          meta: { type: 'exists' },
        },
      ];

      const expectedESQueries = [{ match_all: {} }, { exists: { field: 'foo' } }];

      const result = buildQueryFromFilters(filters);

      expect(result.filter).to.eql(expectedESQueries);
    });

    it('should place negated filters in the must_not clause', function() {
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all', negate: true },
        },
      ];

      const expectedESQueries = [{ match_all: {} }];

      const result = buildQueryFromFilters(filters);

      expect(result.must_not).to.eql(expectedESQueries);
    });

    it('should translate old ES filter syntax into ES 5+ query objects', function() {
      const filters = [
        {
          query: { exists: { field: 'foo' } },
          meta: { type: 'exists' },
        },
      ];

      const expectedESQueries = [
        {
          exists: { field: 'foo' },
        },
      ];

      const result = buildQueryFromFilters(filters);

      expect(result.filter).to.eql(expectedESQueries);
    });

    it('should migrate deprecated match syntax', function() {
      const filters = [
        {
          query: { match: { extension: { query: 'foo', type: 'phrase' } } },
          meta: { type: 'phrase' },
        },
      ];

      const expectedESQueries = [
        {
          match_phrase: { extension: { query: 'foo' } },
        },
      ];

      const result = buildQueryFromFilters(filters);

      expect(result.filter).to.eql(expectedESQueries);
    });

    it('should not add query:queryString:options to query_string filters', function() {
      const filters = [
        {
          query: { query_string: { query: 'foo' } },
          meta: { type: 'query_string' },
        },
      ];
      const expectedESQueries = [{ query_string: { query: 'foo' } }];

      const result = buildQueryFromFilters(filters);

      expect(result.filter).to.eql(expectedESQueries);
    });
  });
});
