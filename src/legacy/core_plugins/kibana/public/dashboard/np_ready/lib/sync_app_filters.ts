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
import {
  FilterManager,
  esFilters,
  compareFilters,
  COMPARE_ALL_OPTIONS,
} from '../../../../../../../plugins/data/public/';
import { DashboardStateManager } from '../dashboard_state_manager';

export function startSyncingAppFilters(
  filterManager: FilterManager,
  dashboardStateManager: DashboardStateManager
) {
  // make sure initial filters are picked up from url
  filterManager.setFilters([
    ...filterManager.getGlobalFilters(),
    ..._.cloneDeep(dashboardStateManager.appState.filters),
  ]);

  const appFiltersSubscription = filterManager
    .getUpdates$()
    .pipe(
      map(() => filterManager.getAppFilters()),
      filter(
        // continue only if app state filters updated
        appFilters =>
          !compareFilters(appFilters, dashboardStateManager.appState.filters, COMPARE_ALL_OPTIONS)
      )
    )
    .subscribe(appFilters => {
      dashboardStateManager.setFilters(appFilters);
    });

  // if appFilters in dashboardStateManager changed (e.g browser history update),
  // sync it to filterManager
  dashboardStateManager.registerChangeListener(() => {
    if (
      !compareFilters(
        dashboardStateManager.appState.filters,
        filterManager.getAppFilters(),
        COMPARE_ALL_OPTIONS
      )
    ) {
      const newAppFilters = _.cloneDeep(dashboardStateManager.appState.filters);
      FilterManager.setFiltersStore(newAppFilters, esFilters.FilterStateStore.APP_STATE);
      filterManager.setFilters([...filterManager.getGlobalFilters(), ...newAppFilters]);
    }
  });

  return () => {
    appFiltersSubscription.unsubscribe();
  };
}
