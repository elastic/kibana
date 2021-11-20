/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternBase, IndexPatternFieldBase } from '../../es_query';
import { buildQueryFilter, buildRangeFilter, Filter, FilterStateStore } from '../build_filters';
import { dedupFilters } from './dedup_filters';

describe('filter manager utilities', () => {
  let indexPattern: IndexPatternBase;

  beforeEach(() => {
    indexPattern = {
      id: 'index',
    } as IndexPatternBase;
  });

  describe('dedupFilters(existing, filters)', () => {
    test('should return only filters which are not in the existing', () => {
      const existing: Filter[] = [
        buildRangeFilter(
          { name: 'bytes' } as IndexPatternFieldBase,
          { from: 0, to: 1024 },
          indexPattern,
          ''
        ),
        buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      ];
      const filters: Filter[] = [
        buildRangeFilter(
          { name: 'bytes' } as IndexPatternFieldBase,
          { from: 1024, to: 2048 },
          indexPattern,
          ''
        ),
        buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      ];
      const results = dedupFilters(existing, filters);

      expect(results).toContain(filters[0]);
      expect(results).not.toContain(filters[1]);
    });

    test('should ignore the disabled attribute when comparing ', () => {
      const existing: Filter[] = [
        buildRangeFilter(
          { name: 'bytes' } as IndexPatternFieldBase,
          { from: 0, to: 1024 },
          indexPattern,
          ''
        ),
        {
          ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index1', ''),
          meta: { disabled: true, negate: false, alias: null },
        },
      ];
      const filters: Filter[] = [
        buildRangeFilter(
          { name: 'bytes' } as IndexPatternFieldBase,
          { from: 1024, to: 2048 },
          indexPattern,
          ''
        ),
        buildQueryFilter({ query_string: { query: 'apache' } }, 'index1', ''),
      ];
      const results = dedupFilters(existing, filters);

      expect(results).toContain(filters[0]);
      expect(results).not.toContain(filters[1]);
    });

    test('should ignore $state attribute', () => {
      const existing: Filter[] = [
        buildRangeFilter(
          { name: 'bytes' } as IndexPatternFieldBase,
          { from: 0, to: 1024 },
          indexPattern,
          ''
        ),
        {
          ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
          $state: { store: FilterStateStore.APP_STATE },
        },
      ];
      const filters: Filter[] = [
        buildRangeFilter(
          { name: 'bytes' } as IndexPatternFieldBase,
          { from: 1024, to: 2048 },
          indexPattern,
          ''
        ),
        {
          ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
          $state: { store: FilterStateStore.GLOBAL_STATE },
        },
      ];
      const results = dedupFilters(existing, filters);

      expect(results).toContain(filters[0]);
      expect(results).not.toContain(filters[1]);
    });
  });
});
