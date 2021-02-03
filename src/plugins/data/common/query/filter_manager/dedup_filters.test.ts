/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { dedupFilters } from './dedup_filters';
import { Filter, buildRangeFilter, buildQueryFilter, FilterStateStore } from '../../es_query';
import { IIndexPattern, IFieldType } from '../../index_patterns';

describe('filter manager utilities', () => {
  let indexPattern: IIndexPattern;

  beforeEach(() => {
    indexPattern = {
      id: 'index',
    } as IIndexPattern;
  });

  describe('dedupFilters(existing, filters)', () => {
    test('should return only filters which are not in the existing', () => {
      const existing: Filter[] = [
        buildRangeFilter({ name: 'bytes' } as IFieldType, { from: 0, to: 1024 }, indexPattern, ''),
        buildQueryFilter({ match: { _term: { query: 'apache', type: 'phrase' } } }, 'index', ''),
      ];
      const filters: Filter[] = [
        buildRangeFilter(
          { name: 'bytes' } as IFieldType,
          { from: 1024, to: 2048 },
          indexPattern,
          ''
        ),
        buildQueryFilter({ match: { _term: { query: 'apache', type: 'phrase' } } }, 'index', ''),
      ];
      const results = dedupFilters(existing, filters);

      expect(results).toContain(filters[0]);
      expect(results).not.toContain(filters[1]);
    });

    test('should ignore the disabled attribute when comparing ', () => {
      const existing: Filter[] = [
        buildRangeFilter({ name: 'bytes' } as IFieldType, { from: 0, to: 1024 }, indexPattern, ''),
        {
          ...buildQueryFilter(
            { match: { _term: { query: 'apache', type: 'phrase' } } },
            'index1',
            ''
          ),
          meta: { disabled: true, negate: false, alias: null },
        },
      ];
      const filters: Filter[] = [
        buildRangeFilter(
          { name: 'bytes' } as IFieldType,
          { from: 1024, to: 2048 },
          indexPattern,
          ''
        ),
        buildQueryFilter({ match: { _term: { query: 'apache', type: 'phrase' } } }, 'index1', ''),
      ];
      const results = dedupFilters(existing, filters);

      expect(results).toContain(filters[0]);
      expect(results).not.toContain(filters[1]);
    });

    test('should ignore $state attribute', () => {
      const existing: Filter[] = [
        buildRangeFilter({ name: 'bytes' } as IFieldType, { from: 0, to: 1024 }, indexPattern, ''),
        {
          ...buildQueryFilter(
            { match: { _term: { query: 'apache', type: 'phrase' } } },
            'index',
            ''
          ),
          $state: { store: FilterStateStore.APP_STATE },
        },
      ];
      const filters: Filter[] = [
        buildRangeFilter(
          { name: 'bytes' } as IFieldType,
          { from: 1024, to: 2048 },
          indexPattern,
          ''
        ),
        {
          ...buildQueryFilter(
            { match: { _term: { query: 'apache', type: 'phrase' } } },
            'index',
            ''
          ),
          $state: { store: FilterStateStore.GLOBAL_STATE },
        },
      ];
      const results = dedupFilters(existing, filters);

      expect(results).toContain(filters[0]);
      expect(results).not.toContain(filters[1]);
    });
  });
});
