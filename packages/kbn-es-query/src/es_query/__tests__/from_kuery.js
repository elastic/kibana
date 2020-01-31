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

import { buildQueryFromKuery } from '../from_kuery';
import indexPattern from '../../__fixtures__/index_pattern_response.json';
import expect from '@kbn/expect';
import { fromKueryExpression, toElasticsearchQuery } from '../../kuery';

describe('build query', function() {
  describe('buildQueryFromKuery', function() {
    it('should return the parameters of an Elasticsearch bool query', function() {
      const result = buildQueryFromKuery(null, [], true);
      const expected = {
        must: [],
        filter: [],
        should: [],
        must_not: [],
      };
      expect(result).to.eql(expected);
    });

    it("should transform an array of kuery queries into ES queries combined in the bool's filter clause", function() {
      const queries = [
        { query: 'extension:jpg', language: 'kuery' },
        { query: 'machine.os:osx', language: 'kuery' },
      ];

      const expectedESQueries = queries.map(query => {
        return toElasticsearchQuery(fromKueryExpression(query.query), indexPattern);
      });

      const result = buildQueryFromKuery(indexPattern, queries, true);

      expect(result.filter).to.eql(expectedESQueries);
    });

    it("should accept a specific date format for a kuery query into an ES query in the bool's filter clause", function() {
      const queries = [{ query: '@timestamp:"2018-04-03T19:04:17"', language: 'kuery' }];

      const expectedESQueries = queries.map(query => {
        return toElasticsearchQuery(fromKueryExpression(query.query), indexPattern, {
          dateFormatTZ: 'America/Phoenix',
        });
      });

      const result = buildQueryFromKuery(indexPattern, queries, true, 'America/Phoenix');

      expect(result.filter).to.eql(expectedESQueries);
    });

    it('should gracefully handle date queries when no date format is provided', function() {
      const queries = [{ query: '@timestamp:"2018-04-03T19:04:17Z"', language: 'kuery' }];

      const expectedESQueries = queries.map(query => {
        return toElasticsearchQuery(fromKueryExpression(query.query), indexPattern);
      });

      const result = buildQueryFromKuery(indexPattern, queries, true);

      expect(result.filter).to.eql(expectedESQueries);
    });
  });
});
