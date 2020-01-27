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
import { esFilters } from '../../../common';
import { BaseStateContainer } from '../../../../../plugins/kibana_utils/public';
import { QueryStart } from '../query_service';

/**
 * Helper utility to sync application's state filters, with filter manager
 * @param filterManager
 * @param appState
 */
export function syncAppFilters<S extends { appFilters: esFilters.Filter[] }>(
  { filterManager }: QueryStart,
  appState: BaseStateContainer<S>
) {
  // make sure initial app filters are picked by filterManager
  filterManager.setAppFilters(_.cloneDeep(appState.get().appFilters));

  const subs = [
    filterManager
      .getUpdates$()
      .pipe(
        map(() => filterManager.getAppFilters()),
        filter(
          // continue only if app state filters updated
          appFilters => !compareFilters(appFilters, appState.get().appFilters, COMPARE_ALL_OPTIONS)
        )
      )
      .subscribe(appFilters => {
        appState.set({ ...appState.get(), appFilters } as S);
      }),

    // if appFilters in dashboardStateManager changed (e.g browser history update),
    // sync it to filterManager
    appState.state$.subscribe(() => {
      if (
        !compareFilters(
          appState.get().appFilters,
          filterManager.getAppFilters(),
          COMPARE_ALL_OPTIONS
        )
      ) {
        filterManager.setAppFilters(_.cloneDeep(appState.get().appFilters));
      }
    }),
  ];

  return () => {
    subs.forEach(s => s.unsubscribe());
  };
}
