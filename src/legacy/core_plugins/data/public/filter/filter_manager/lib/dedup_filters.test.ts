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

import { Filter, buildRangeFilter, FilterStateStore, buildQueryFilter } from '@kbn/es-query';
import { dedupFilters } from './dedup_filters';

describe('filter manager utilities', () => {
  describe('dedupFilters(existing, filters)', () => {
    test('should return only filters which are not in the existing', () => {
      const existing: Filter[] = [
        buildRangeFilter({ name: 'bytes' }, { from: 0, to: 1024 }, 'index'),
        buildQueryFilter({ match: { _term: { query: 'apache', type: 'phrase' } } }, 'index'),
      ];
      const filters: Filter[] = [
        buildRangeFilter({ name: 'bytes' }, { from: 1024, to: 2048 }, 'index'),
        buildQueryFilter({ match: { _term: { query: 'apache', type: 'phrase' } } }, 'index'),
      ];
      const results = dedupFilters(existing, filters);

      expect(results).toContain(filters[0]);
      expect(results).not.toContain(filters[1]);
    });

    test('should ignore the disabled attribute when comparing ', () => {
      const existing: Filter[] = [
        buildRangeFilter({ name: 'bytes' }, { from: 0, to: 1024 }, 'index'),
        {
          ...buildQueryFilter({ match: { _term: { query: 'apache', type: 'phrase' } } }, 'index'),
          meta: { disabled: true, negate: false, alias: null },
        },
      ];
      const filters: Filter[] = [
        buildRangeFilter({ name: 'bytes' }, { from: 1024, to: 2048 }, 'index'),
        buildQueryFilter({ match: { _term: { query: 'apache', type: 'phrase' } } }, 'index'),
      ];
      const results = dedupFilters(existing, filters);

      expect(results).toContain(filters[0]);
      expect(results).not.toContain(filters[1]);
    });

    test('should ignore $state attribute', () => {
      const existing: Filter[] = [
        buildRangeFilter({ name: 'bytes' }, { from: 0, to: 1024 }, 'index'),
        {
          ...buildQueryFilter({ match: { _term: { query: 'apache', type: 'phrase' } } }, 'index'),
          $state: { store: FilterStateStore.APP_STATE },
        },
      ];
      const filters: Filter[] = [
        buildRangeFilter({ name: 'bytes' }, { from: 1024, to: 2048 }, 'index'),
        {
          ...buildQueryFilter({ match: { _term: { query: 'apache', type: 'phrase' } } }, 'index'),
          $state: { store: FilterStateStore.GLOBAL_STATE },
        },
      ];
      const results = dedupFilters(existing, filters);

      expect(results).toContain(filters[0]);
      expect(results).not.toContain(filters[1]);
    });
  });
});
