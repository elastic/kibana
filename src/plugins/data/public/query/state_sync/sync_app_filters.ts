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

import _ from 'lodash';
import { filter, map } from 'rxjs/operators';
import { COMPARE_ALL_OPTIONS, compareFilters } from '../filter_manager/lib/compare_filters';
import { Filter } from '../../../common';
import { FilterManager } from '../filter_manager';
import { BaseStateContainer } from '../../../../../plugins/kibana_utils/public';

/**
 * Helper utility to sync application's state filters, with filter manager
 * @param filterManager
 * @param appState
 */
export function syncAppFilters(
  filterManager: FilterManager,
  appState: BaseStateContainer<Filter[]>
) {
  // make sure initial app filters are picked by filterManager
  filterManager.setAppFilters(_.cloneDeep(appState.get()));

  const subs = [
    filterManager
      .getUpdates$()
      .pipe(
        map(() => filterManager.getAppFilters()),
        filter(
          // continue only if app state filters updated
          appFilters => !compareFilters(appFilters, appState.get(), COMPARE_ALL_OPTIONS)
        )
      )
      .subscribe(appFilters => {
        appState.set(appFilters);
      }),

    // if appFilters in dashboardStateManager changed (e.g browser history update),
    // sync it to filterManager
    appState.state$.subscribe(() => {
      if (!compareFilters(appState.get(), filterManager.getAppFilters(), COMPARE_ALL_OPTIONS)) {
        filterManager.setAppFilters(_.cloneDeep(appState.get()));
      }
    }),
  ];

  return () => {
    subs.forEach(s => s.unsubscribe());
  };
}
