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

import { buildQueryFromFilters } from './from_filters';
import { IIndexPattern } from '../../index_patterns';
import { ExistsFilter, Filter, MatchAllFilter } from '../filters';
import { fields } from '../../index_patterns/mocks';

describe('build query', () => {
  const indexPattern: IIndexPattern = ({
    fields,
  } as unknown) as IIndexPattern;

  describe('buildQueryFromFilters', () => {
    test('should return the parameters of an Elasticsearch bool query', () => {
      const result = buildQueryFromFilters([], indexPattern, false);
      const expected = {
        must: [],
        filter: [],
        should: [],
        must_not: [],
      };
      expect(result).toEqual(expected);
    });

    test('should transform an array of kibana filters into ES queries combined in the bool clauses', () => {
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all' },
        } as MatchAllFilter,
        {
          exists: { field: 'foo' },
          meta: { type: 'exists' },
        } as ExistsFilter,
      ] as Filter[];

      const expectedESQueries = [{ match_all: {} }, { exists: { field: 'foo' } }];

      const result = buildQueryFromFilters(filters, indexPattern, false);

      expect(result.filter).toEqual(expectedESQueries);
    });

    test('should remove disabled filters', () => {
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all', negate: true, disabled: true },
        } as MatchAllFilter,
      ] as Filter[];
      const result = buildQueryFromFilters(filters, indexPattern, false);

      expect(result.must_not).toEqual([]);
    });

    test('should remove falsy filters', () => {
      const filters = ([null, undefined] as unknown) as Filter[];
      const result = buildQueryFromFilters(filters, indexPattern, false);

      expect(result.must_not).toEqual([]);
      expect(result.must).toEqual([]);
    });

    test('should place negated filters in the must_not clause', () => {
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all', negate: true },
        } as MatchAllFilter,
      ] as Filter[];

      const expectedESQueries = [{ match_all: {} }];

      const result = buildQueryFromFilters(filters, indexPattern, false);

      expect(result.must_not).toEqual(expectedESQueries);
    });

    test('should translate old ES filter syntax into ES 5+ query objects', () => {
      const filters = [
        {
          query: { exists: { field: 'foo' } },
          meta: { type: 'exists' },
        },
      ] as Filter[];

      const expectedESQueries = [
        {
          exists: { field: 'foo' },
        },
      ];

      const result = buildQueryFromFilters(filters, indexPattern, false);

      expect(result.filter).toEqual(expectedESQueries);
    });

    test('should migrate deprecated match syntax', () => {
      const filters = [
        {
          query: { match: { extension: { query: 'foo', type: 'phrase' } } },
          meta: { type: 'phrase' },
        },
      ] as Filter[];

      const expectedESQueries = [
        {
          match_phrase: { extension: { query: 'foo' } },
        },
      ];

      const result = buildQueryFromFilters(filters, indexPattern, false);

      expect(result.filter).toEqual(expectedESQueries);
    });

    test('should not add query:queryString:options to query_string filters', () => {
      const filters = [
        {
          query: { query_string: { query: 'foo' } },
          meta: { type: 'query_string' },
        },
      ] as Filter[];

      const expectedESQueries = [{ query_string: { query: 'foo' } }];
      const result = buildQueryFromFilters(filters, indexPattern, false);

      expect(result.filter).toEqual(expectedESQueries);
    });

    test('should wrap filters targeting nested fields in a nested query', () => {
      const filters = [
        {
          exists: { field: 'nestedField.child' },
          meta: { type: 'exists', alias: '', disabled: false, negate: false },
        },
      ];

      const expectedESQueries = [
        {
          nested: {
            path: 'nestedField',
            query: {
              exists: {
                field: 'nestedField.child',
              },
            },
          },
        },
      ];

      const result = buildQueryFromFilters(filters, indexPattern);
      expect(result.filter).toEqual(expectedESQueries);
    });
  });
});
