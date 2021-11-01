/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildQueryFromFilters } from './from_filters';
import { ExistsFilter, Filter, MatchAllFilter } from '../filters';
import { fields } from '../filters/stubs';
import { DataViewBase } from './types';

describe('build query', () => {
  const indexPattern: DataViewBase = {
    fields,
    title: 'dataView',
  };

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
          query: { match_all: {} },
          meta: { type: 'match_all' },
        } as MatchAllFilter,
        {
          query: { exists: { field: 'foo' } },
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
          query: { match_all: {} },
          meta: { type: 'match_all', negate: true, disabled: true },
        } as MatchAllFilter,
      ] as Filter[];
      const result = buildQueryFromFilters(filters, indexPattern, false);

      expect(result.must_not).toEqual([]);
    });

    test('should remove falsy filters', () => {
      const filters = [null, undefined] as unknown as Filter[];
      const result = buildQueryFromFilters(filters, indexPattern, false);

      expect(result.must_not).toEqual([]);
      expect(result.must).toEqual([]);
    });

    test('should place negated filters in the must_not clause', () => {
      const filters = [
        {
          query: { match_all: {} },
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
          match: { extension: { query: 'foo', type: 'phrase' } },
          meta: { type: 'phrase' },
        },
      ] as unknown as Filter[];

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
          query: { exists: { field: 'nestedField.child' } },
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
