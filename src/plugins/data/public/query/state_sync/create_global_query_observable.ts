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
import { filter, map } from 'rxjs/operators';
import { TimefilterSetup } from '../timefilter';
import { COMPARE_ALL_OPTIONS, compareFilters, FilterManager } from '../filter_manager';
import { QueryGlobalState } from './index';
import { createStateContainer } from '../../../../kibana_utils/public';

export function createGlobalQueryObservable({
  timefilter: { timefilter },
  filterManager,
}: {
  timefilter: TimefilterSetup;
  filterManager: FilterManager;
}): Observable<QueryGlobalState> {
  return new Observable(subscriber => {
    const state = createStateContainer<QueryGlobalState>({
      time: timefilter.getTime(),
      refreshInterval: timefilter.getRefreshInterval(),
      filters: filterManager.getGlobalFilters(),
    });

    const subs: Subscription[] = [
      timefilter.getTimeUpdate$().subscribe(() => {
        state.set({ ...state.get(), time: timefilter.getTime() });
      }),
      timefilter.getRefreshIntervalUpdate$().subscribe(() => {
        state.set({ ...state.get(), refreshInterval: timefilter.getRefreshInterval() });
      }),
      filterManager
        .getUpdates$()
        .pipe(
          // we need to track only global filters here
          map(() => filterManager.getGlobalFilters()),
          // continue only if global filters changed
          // and ignore app state filters
          filter(
            newGlobalFilters =>
              !compareFilters(newGlobalFilters, state.get().filters || [], COMPARE_ALL_OPTIONS)
          )
        )
        .subscribe(newGlobalFilters => {
          state.set({ ...state.get(), filters: newGlobalFilters });
        }),
      state.state$.subscribe(subscriber),
    ];
    return () => {
      subs.forEach(s => s.unsubscribe());
    };
  });
}
