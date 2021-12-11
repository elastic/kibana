/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildEsQuery } from './build_es_query';
import { fromKueryExpression, toElasticsearchQuery } from '../kuery';
import { luceneStringToDsl } from './lucene_string_to_dsl';
import { decorateQuery } from './decorate_query';
import { MatchAllFilter, Query } from '../filters';
import { fields } from '../filters/stubs';
import { DataViewBase } from './types';

jest.mock('../kuery/grammar');

describe('build query', () => {
  const indexPattern: DataViewBase = {
    fields,
    title: 'dataView',
  };

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
      const filters = {
        query: {
          match: {
            a: 'b',
          },
        },
        meta: {
          alias: '',
          disabled: false,
          negate: false,
        },
      };
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
            {
              match: {
                a: 'b',
              },
            },
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
        query: {
          match: {
            a: 'b',
          },
        },
        meta: {
          alias: '',
          disabled: false,
          negate: false,
        },
      };
      const config = {
        allowLeadingWildcards: true,
        queryStringOptions: {},
        ignoreFilterIfFieldNotInIndex: false,
      };

      const expectedResult = {
        bool: {
          must: [decorateQuery(luceneStringToDsl('extension:jpg'), config.queryStringOptions)],
          filter: [
            {
              match: {
                a: 'b',
              },
            },
          ],
          should: [],
          must_not: [],
        },
      };

      const result = buildEsQuery(indexPattern, queries, filters, config);

      expect(result).toEqual(expectedResult);
    });

    it('should remove match_all clauses', () => {
      const filters = [
        {
          query: { match_all: {} },
          meta: { type: 'match_all' },
        } as MatchAllFilter,
        {
          query: {
            match: {
              a: 'b',
            },
          },
          meta: {
            alias: '',
            disabled: false,
            negate: false,
          },
        },
      ];
      const config = {
        allowLeadingWildcards: true,
        queryStringOptions: {},
        ignoreFilterIfFieldNotInIndex: false,
      };

      const expectedResult = {
        bool: {
          must: [],
          filter: [
            {
              match: {
                a: 'b',
              },
            },
          ],
          should: [],
          must_not: [],
        },
      };

      const result = buildEsQuery(indexPattern, [], filters, config);

      expect(result).toEqual(expectedResult);
    });

    it('should use the default time zone set in the Advanced Settings in queries and filters', () => {
      const queries = [
        { query: '@timestamp:"2019-03-23T13:18:00"', language: 'kuery' },
        { query: '@timestamp:"2019-03-23T13:18:00"', language: 'lucene' },
      ] as Query[];
      const filters = [{ query: { match_all: {} }, meta: { type: 'match_all' } } as MatchAllFilter];
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
