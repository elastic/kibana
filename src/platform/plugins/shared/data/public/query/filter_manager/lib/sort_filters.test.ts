/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sortFilters } from './sort_filters';
import type { Filter } from '@kbn/es-query';
import { buildQueryFilter } from '@kbn/es-query';

describe('sortFilters', () => {
  describe('sortFilters()', () => {
    test('Not sort two application level filters', () => {
      const f1 = {
        $state: { store: 'appState' },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      } as Filter;
      const f2 = {
        $state: { store: 'appState' },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      } as Filter;

      const filters = [f1, f2].sort(sortFilters);
      expect(filters[0]).toBe(f1);
    });

    test('Not sort two global level filters', () => {
      const f1 = {
        $state: { store: 'globalState' },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      } as Filter;
      const f2 = {
        $state: { store: 'globalState' },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      } as Filter;

      const filters = [f1, f2].sort(sortFilters);
      expect(filters[0]).toBe(f1);
    });

    test('Move global level filter to the beginning of the array', () => {
      const f1 = {
        $state: { store: 'appState' },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      } as Filter;
      const f2 = {
        $state: { store: 'globalState' },
        ...buildQueryFilter({ query_string: { query: 'apache' } }, 'index', ''),
      } as Filter;

      const filters = [f1, f2].sort(sortFilters);
      expect(filters[0]).toBe(f2);
    });
  });
});
