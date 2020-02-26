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

import { uniqFilters } from './uniq_filters';
import { buildQueryFilter, Filter, FilterStateStore } from '../../../../common';

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
