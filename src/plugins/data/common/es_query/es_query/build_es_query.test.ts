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

import { buildEsQuery } from './build_es_query';
import { fromKueryExpression, toElasticsearchQuery } from '../kuery';
import { luceneStringToDsl } from './lucene_string_to_dsl';
import { decorateQuery } from './decorate_query';
import { IIndexPattern } from '../../index_patterns';
import { MatchAllFilter } from '../filters';
import { fields } from '../../index_patterns/mocks';
import { Query } from '../../query/types';

describe('build query', () => {
  const indexPattern: IIndexPattern = ({
    fields,
  } as unknown) as IIndexPattern;

  describe('buildEsQuery', () => {
    it('should return the parameters of an Elasticsearch bool query', () => {
      const result = buildEsQuery(indexPattern, [], []);
      const expected = {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        },
      };
      expect(result).toEqual(expected);
    });

    it('should combine queries and filters from multiple query languages into a single ES bool query', () => {
      const queries = [
        { query: 'extension:jpg', language: 'kuery' },
        { query: 'bar:baz', language: 'lucene' },
      ] as Query[];
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all' },
        } as MatchAllFilter,
      ];
      const config = {
        allowLeadingWildcards: true,
        queryStringOptions: {},
        ignoreFilterIfFieldNotInIndex: false,
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

      expect(result).toEqual(expectedResult);
    });

    it('should accept queries and filters as either single objects or arrays', () => {
      const queries = { query: 'extension:jpg', language: 'lucene' } as Query;
      const filters = {
        match_all: {},
        meta: { type: 'match_all' },
      } as MatchAllFilter;
      const config = {
        allowLeadingWildcards: true,
        queryStringOptions: {},
        ignoreFilterIfFieldNotInIndex: false,
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

      expect(result).toEqual(expectedResult);
    });

    it('should use the default time zone set in the Advanced Settings in queries and filters', () => {
      const queries = [
        { query: '@timestamp:"2019-03-23T13:18:00"', language: 'kuery' },
        { query: '@timestamp:"2019-03-23T13:18:00"', language: 'lucene' },
      ] as Query[];
      const filters = [{ match_all: {}, meta: { type: 'match_all' } } as MatchAllFilter];
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

      expect(result).toEqual(expectedResult);
    });
  });
});
