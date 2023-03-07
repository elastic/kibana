/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { COMPARE_ALL_OPTIONS, compareFilters } from './compare_filters';
import {
  BooleanRelation,
  buildCombinedFilter,
  buildEmptyFilter,
  buildQueryFilter,
  FilterStateStore,
} from '..';
import { DataViewBase } from '../../..';

describe('filter manager utilities', () => {
  describe('compare filters', () => {
    test('should compare filters', () => {
      const f1 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index', '');
      const f2 = buildEmptyFilter(true);

      expect(compareFilters(f1, f2)).toBeFalsy();
    });

    test('should compare duplicates', () => {
      const f1 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index', '');
      const f2 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index', '');

      expect(compareFilters(f1, f2)).toBeTruthy();
    });

    test('should compare filters, where one filter is null', () => {
      const f1 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index', '');
      const f2 = null;
      expect(compareFilters(f1, f2 as any)).toBeFalsy();
    });

    test('should compare a null filter with an empty filter', () => {
      const f1 = null;
      const f2 = buildEmptyFilter(true);
      expect(compareFilters(f1 as any, f2)).toBeFalsy();
    });

    test('should compare duplicates, ignoring meta attributes', () => {
      const f1 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index1', '');
      const f2 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index2', '');

      expect(compareFilters(f1, f2)).toBeTruthy();
    });

    test('should compare duplicates, ignoring $state attributes', () => {
      const f1 = {
        $state: { store: FilterStateStore.APP_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };
      const f2 = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };

      expect(compareFilters(f1, f2)).toBeTruthy();
    });

    test('should compare filters array to non array', () => {
      const f1 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index', '');

      const f2 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index', '');

      expect(compareFilters([f1, f2], f1)).toBeFalsy();
    });

    test('should compare filters array to partial array', () => {
      const f1 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index', '');

      const f2 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index', '');

      expect(compareFilters([f1, f2], [f1])).toBeFalsy();
    });

    test('should compare filters array to exact array', () => {
      const f1 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index', '');

      const f2 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index', '');

      expect(compareFilters([f1, f2], [f1, f2])).toBeTruthy();
    });

    test('should compare array of duplicates, ignoring meta attributes', () => {
      const f1 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index1', '');
      const f2 = buildQueryFilter({ query_string: { query: 'apache' } }, 'index2', '');

      expect(compareFilters([f1], [f2])).toBeTruthy();
    });

    test('should compare array of duplicates, ignoring $state attributes', () => {
      const f1 = {
        $state: { store: FilterStateStore.APP_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };
      const f2 = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };

      expect(compareFilters([f1], [f2])).toBeTruthy();
    });

    test('should compare duplicates with COMPARE_ALL_OPTIONS should check store', () => {
      const f1 = {
        $state: { store: FilterStateStore.APP_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };
      const f2 = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };

      expect(compareFilters([f1], [f2], COMPARE_ALL_OPTIONS)).toBeFalsy();
    });

    test('should compare duplicates with COMPARE_ALL_OPTIONS should not check key and value ', () => {
      const f1 = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };
      const f2 = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };

      f2.meta.key = 'wassup';
      f2.meta.value = 'dog';

      expect(compareFilters([f1], [f2], COMPARE_ALL_OPTIONS)).toBeTruthy();
    });

    test('should compare alias with alias true', () => {
      const f1 = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };
      const f2 = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };

      f2.meta.alias = 'wassup';
      f2.meta.alias = 'dog';

      expect(compareFilters([f1], [f2], { alias: true })).toBeFalsy();
    });

    test('should compare alias with COMPARE_ALL_OPTIONS', () => {
      const f1 = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };
      const f2 = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };

      f2.meta.alias = 'wassup';
      f2.meta.alias = 'dog';

      expect(compareFilters([f1], [f2], COMPARE_ALL_OPTIONS)).toBeFalsy();
    });

    test('should compare index with index true', () => {
      const f1 = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };
      const f2 = {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      };

      f2.meta.index = 'wassup';
      f2.meta.index = 'dog';

      expect(compareFilters([f1], [f2], { index: true })).toBeFalsy();
    });

    test('should compare two AND filters as the same', () => {
      const dataView: DataViewBase = {
        id: 'logstash-*',
        fields: [
          {
            name: 'bytes',
            type: 'number',
            scripted: false,
          },
        ],
        title: 'dataView',
      };

      const f1 = buildQueryFilter({ query_string: { query: 'apache' } }, dataView.id!, '');
      const f2 = buildQueryFilter({ query_string: { query: 'apache' } }, dataView.id!, '');
      const f3 = buildCombinedFilter(BooleanRelation.AND, [f1, f2], dataView);
      const f4 = buildCombinedFilter(BooleanRelation.AND, [f1, f2], dataView);

      expect(compareFilters([f3], [f4])).toBeTruthy();
    });

    test('should compare an AND and OR filter as different', () => {
      const dataView: DataViewBase = {
        id: 'logstash-*',
        fields: [
          {
            name: 'bytes',
            type: 'number',
            scripted: false,
          },
        ],
        title: 'dataView',
      };

      const f1 = buildQueryFilter({ query_string: { query: 'apache' } }, dataView.id!, '');
      const f2 = buildQueryFilter({ query_string: { query: 'apache' } }, dataView.id!, '');
      const f3 = buildCombinedFilter(BooleanRelation.AND, [f1, f2], dataView);
      const f4 = buildCombinedFilter(BooleanRelation.OR, [f1, f2], dataView);

      expect(compareFilters([f3], [f4])).toBeFalsy();
    });

    test('should compare two different combined filters as different', () => {
      const dataView: DataViewBase = {
        id: 'logstash-*',
        fields: [
          {
            name: 'bytes',
            type: 'number',
            scripted: false,
          },
        ],
        title: 'dataView',
      };

      const f1 = buildQueryFilter({ query_string: { query: 'apache' } }, dataView.id!, '');
      const f2 = buildQueryFilter({ query_string: { query: 'apaches' } }, dataView.id!, '');
      const f3 = buildCombinedFilter(BooleanRelation.AND, [f1], dataView);
      const f4 = buildCombinedFilter(BooleanRelation.AND, [f2], dataView);

      expect(compareFilters([f3], [f4])).toBeFalsy();
    });
  });
});
