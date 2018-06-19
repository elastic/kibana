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

// This file is used by Timelion and TSVB
import _ from 'lodash';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import 'ui/state_management/app_state';
import { luceneStringToDsl } from '../../../../ui/public/courier/data_source/build_query/lucene_string_to_dsl';
import { migrateFilter } from 'ui/courier/data_source/_migrate_filter';

export function dashboardContextProvider(Private, getAppState) {
  return () => {
    const appState = getAppState();
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const bool = { must: [], must_not: [] };
    if (!appState) { return { bool: bool }; }
    const filterBarFilters = queryFilter.getFilters();
    const queryBarQuery = appState.query;

    if (queryBarQuery.language === 'lucene') {
      // Add the query bar filter, its handled differently.
      const query = luceneStringToDsl(queryBarQuery.query);
      if (query) { bool.must.push(query); }
    }

    // Add each of the filter bar filters
    _.each(filterBarFilters, function (filter) {
      const esFilter = _.omit(filter, function (val, key) {
        if (key === 'meta' || key[0] === '$') { return true; }
        return false;
      });

      if (filter.meta.disabled) { return; }
      if (filter.meta.negate) {
        bool.must_not = bool.must_not || [];
        if (esFilter.query || esFilter) { bool.must_not.push(migrateFilter(esFilter.query || esFilter)); }
      } else {
        bool.must = bool.must || [];
        if (esFilter.query || esFilter) { bool.must.push(migrateFilter(esFilter.query || esFilter)); }
      }
    });

    return { bool: bool };
  };
}
