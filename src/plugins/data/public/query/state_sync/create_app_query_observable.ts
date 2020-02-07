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
import { QueryAppState } from './index';
import { createStateContainer } from '../../../../kibana_utils/common/state_containers';

export function createAppQueryObservable({
  timefilter: { timefilter },
  filterManager,
}: {
  timefilter: TimefilterSetup;
  filterManager: FilterManager;
}): Observable<QueryAppState> {
  return new Observable(subscriber => {
    const state = createStateContainer<QueryAppState>({
      filters: filterManager.getAppFilters(),
    });

    const subs: Subscription[] = [
      filterManager
        .getUpdates$()
        .pipe(
          // we need to track only app filters here
          map(() => filterManager.getAppFilters()),
          // continue only if app filters changed
          // and ignore global state filters
          filter(
            newAppFilters =>
              !compareFilters(newAppFilters, state.get().filters || [], COMPARE_ALL_OPTIONS)
          )
        )
        .subscribe(newAppFilters => {
          state.set({ ...state.get(), filters: newAppFilters });
        }),
      state.state$.subscribe(subscriber),
    ];
    return () => {
      subs.forEach(s => s.unsubscribe());
    };
  });
}
