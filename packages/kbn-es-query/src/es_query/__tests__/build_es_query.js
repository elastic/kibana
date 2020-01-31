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
import { buildEsQuery } from '../build_es_query';
import indexPattern from '../../__fixtures__/index_pattern_response.json';
import { fromKueryExpression, toElasticsearchQuery } from '../../kuery';
import { luceneStringToDsl } from '../lucene_string_to_dsl';
import { decorateQuery } from '../decorate_query';

describe('build query', function() {
  describe('buildEsQuery', function() {
    it('should return the parameters of an Elasticsearch bool query', function() {
      const result = buildEsQuery();
      const expected = {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        },
      };
      expect(result).to.eql(expected);
    });

    it('should combine queries and filters from multiple query languages into a single ES bool query', function() {
      const queries = [
        { query: 'extension:jpg', language: 'kuery' },
        { query: 'bar:baz', language: 'lucene' },
      ];
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all' },
        },
      ];
      const config = {
        allowLeadingWildcards: true,
        queryStringOptions: {},
      };

      const expectedResult = {
        bool: {
          must: [decorateQuery(luceneStringToDsl('bar:baz'), config.queryStringOptions)],
          filter: [
            toElasticsearchQuery(fromKueryExpression('extension:jpg'), indexPattern),
            { match_all: {} },
          ],
          should: [],
          must_not: [],
        },
      };

      const result = buildEsQuery(indexPattern, queries, filters, config);

      expect(result).to.eql(expectedResult);
    });

    it('should accept queries and filters as either single objects or arrays', function() {
      const queries = { query: 'extension:jpg', language: 'lucene' };
      const filters = {
        match_all: {},
        meta: { type: 'match_all' },
      };
      const config = {
        allowLeadingWildcards: true,
        queryStringOptions: {},
      };

      const expectedResult = {
        bool: {
          must: [decorateQuery(luceneStringToDsl('extension:jpg'), config.queryStringOptions)],
          filter: [{ match_all: {} }],
          should: [],
          must_not: [],
        },
      };

      const result = buildEsQuery(indexPattern, queries, filters, config);

      expect(result).to.eql(expectedResult);
    });

    it('should use the default time zone set in the Advanced Settings in queries and filters', function() {
      const queries = [
        { query: '@timestamp:"2019-03-23T13:18:00"', language: 'kuery' },
        { query: '@timestamp:"2019-03-23T13:18:00"', language: 'lucene' },
      ];
      const filters = [{ match_all: {}, meta: { type: 'match_all' } }];
      const config = {
        allowLeadingWildcards: true,
        queryStringOptions: {},
        ignoreFilterIfFieldNotInIndex: false,
        dateFormatTZ: 'Africa/Johannesburg',
      };

      const expectedResult = {
        bool: {
          must: [
            decorateQuery(
              luceneStringToDsl('@timestamp:"2019-03-23T13:18:00"'),
              config.queryStringOptions,
              config.dateFormatTZ
            ),
          ],
          filter: [
            toElasticsearchQuery(
              fromKueryExpression('@timestamp:"2019-03-23T13:18:00"'),
              indexPattern,
              config
            ),
            { match_all: {} },
          ],
          should: [],
          must_not: [],
        },
      };
      const result = buildEsQuery(indexPattern, queries, filters, config);
      expect(result).to.eql(expectedResult);
    });
  });
});
