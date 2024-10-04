/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildQueryFilter, Filter, FilterStateStore } from '../build_filters';
import { uniqFilters } from './uniq_filters';

describe('filter manager utilities', () => {
  describe('niqFilter', () => {
    test('should filter out dups', () => {
      const before: Filter[] = [
        buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
        buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      ];
      const results = uniqFilters(before);

      expect(results).toHaveLength(1);
    });

    test('should filter out duplicates, ignoring meta attributes', () => {
      const before: Filter[] = [
        buildQueryFilter({ query_string: { query: 'apache' } }, 'index1', ''),
        buildQueryFilter({ query_string: { query: 'apache' } }, 'index2', ''),
      ];
      const results = uniqFilters(before);

      expect(results).toHaveLength(1);
    });

    test('should filter out duplicates, ignoring $state attributes', () => {
      const before: Filter[] = [
        {
          $state: { store: FilterStateStore.APP_STATE },
          ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
        },
        {
          $state: { store: FilterStateStore.GLOBAL_STATE },
          ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
        },
      ];
      const results = uniqFilters(before);

      expect(results).toHaveLength(1);
    });
  });
});
