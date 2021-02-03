/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { uniqFilters } from './uniq_filters';
import { buildQueryFilter, Filter, FilterStateStore } from '../../es_query';

describe('filter manager utilities', () => {
  describe('niqFilter', () => {
    test('should filter out dups', () => {
      const before: Filter[] = [
        buildQueryFilter({ _type: { match: { query: 'apache', type: 'phrase' } } }, 'index', ''),
        buildQueryFilter({ _type: { match: { query: 'apache', type: 'phrase' } } }, 'index', ''),
      ];
      const results = uniqFilters(before);

      expect(results).toHaveLength(1);
    });

    test('should filter out duplicates, ignoring meta attributes', () => {
      const before: Filter[] = [
        buildQueryFilter({ _type: { match: { query: 'apache', type: 'phrase' } } }, 'index1', ''),
        buildQueryFilter({ _type: { match: { query: 'apache', type: 'phrase' } } }, 'index2', ''),
      ];
      const results = uniqFilters(before);

      expect(results).toHaveLength(1);
    });

    test('should filter out duplicates, ignoring $state attributes', () => {
      const before: Filter[] = [
        {
          $state: { store: FilterStateStore.APP_STATE },
          ...buildQueryFilter(
            { _type: { match: { query: 'apache', type: 'phrase' } } },
            'index',
            ''
          ),
        },
        {
          $state: { store: FilterStateStore.GLOBAL_STATE },
          ...buildQueryFilter(
            { _type: { match: { query: 'apache', type: 'phrase' } } },
            'index',
            ''
          ),
        },
      ];
      const results = uniqFilters(before);

      expect(results).toHaveLength(1);
    });
  });
});
