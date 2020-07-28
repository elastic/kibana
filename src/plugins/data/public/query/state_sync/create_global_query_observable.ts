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

import { Observable, Subscription } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { TimefilterSetup } from '../timefilter';
import { FilterManager } from '../filter_manager';
import { QueryState, QueryStateChange } from './index';
import { createStateContainer } from '../../../../kibana_utils/public';
import { isFilterPinned, compareFilters, COMPARE_ALL_OPTIONS } from '../../../common';

export function createQueryStateObservable({
  timefilter: { timefilter },
  filterManager,
}: {
  timefilter: TimefilterSetup;
  filterManager: FilterManager;
}): Observable<{ changes: QueryStateChange; state: QueryState }> {
  return new Observable((subscriber) => {
    const state = createStateContainer<QueryState>({
      time: timefilter.getTime(),
      refreshInterval: timefilter.getRefreshInterval(),
      filters: filterManager.getFilters(),
    });

    let currentChange: QueryStateChange = {};
    const subs: Subscription[] = [
      timefilter.getTimeUpdate$().subscribe(() => {
        currentChange.time = true;
        state.set({ ...state.get(), time: timefilter.getTime() });
      }),
      timefilter.getRefreshIntervalUpdate$().subscribe(() => {
        currentChange.refreshInterval = true;
        state.set({ ...state.get(), refreshInterval: timefilter.getRefreshInterval() });
      }),
      filterManager.getUpdates$().subscribe(() => {
        currentChange.filters = true;

        const { filters } = state.get();
        const globalOld = filters?.filter((f) => isFilterPinned(f));
        const appOld = filters?.filter((f) => !isFilterPinned(f));
        const globalNew = filterManager.getGlobalFilters();
        const appNew = filterManager.getAppFilters();

        if (!globalOld || !compareFilters(globalOld, globalNew, COMPARE_ALL_OPTIONS)) {
          currentChange.globalFilters = true;
        }

        if (!appOld || !compareFilters(appOld, appNew, COMPARE_ALL_OPTIONS)) {
          currentChange.appFilters = true;
        }

        state.set({
          ...state.get(),
          filters: filterManager.getFilters(),
        });
      }),
      state.state$
        .pipe(
          map((newState) => ({ state: newState, changes: currentChange })),
          tap(() => {
            currentChange = {};
          })
        )
        .subscribe(subscriber),
    ];
    return () => {
      subs.forEach((s) => s.unsubscribe());
    };
  });
}
