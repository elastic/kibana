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

import { Subscription } from 'rxjs';
import _ from 'lodash';
import { filter, map } from 'rxjs/operators';
import { BaseStateContainer } from '../../../../kibana_utils/public';
import { COMPARE_ALL_OPTIONS, compareFilters } from '../filter_manager/lib/compare_filters';
import { esFilters, RefreshInterval, TimeRange } from '../../../common';
import { QueryStart } from '../query_service';

export interface QueryState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
  filters?: esFilters.Filter[];
}

/**
 * Helper utility to sync global data from query services with state container
 * @param filterManager
 * @param appState
 */
export const syncQuery = <S extends QueryState>(
  { timefilter: { timefilter }, filterManager }: QueryStart,
  globalState: BaseStateContainer<S>
) => {
  const subs: Subscription[] = [
    timefilter.getTimeUpdate$().subscribe(() => {
      globalState.set({ ...globalState.get(), time: timefilter.getTime() } as S);
    }),
    timefilter.getRefreshIntervalUpdate$().subscribe(() => {
      globalState.set({
        ...globalState.get(),
        refreshInterval: timefilter.getRefreshInterval(),
      } as S);
    }),
    filterManager
      .getUpdates$()
      .pipe(
        map(() => filterManager.getGlobalFilters()), // we need to track only global filters here
        filter(newGlobalFilters => {
          // continue only if global filters changed
          // and ignore app state filters
          const oldGlobalFilters = globalState.get().filters;
          return (
            !oldGlobalFilters ||
            !compareFilters(newGlobalFilters, oldGlobalFilters, COMPARE_ALL_OPTIONS)
          );
        })
      )
      .subscribe(newGlobalFilters => {
        globalState.set({ ...globalState.get(), filters: newGlobalFilters } as S);
      }),
    globalState.state$.subscribe(({ time, filters: globalFilters, refreshInterval }) => {
      // cloneDeep is required because services are mutating passed objects
      // and state in state container is frozen
      if (time && !_.isEqual(time, timefilter.getTime())) {
        timefilter.setTime(_.cloneDeep(time));
      }

      if (refreshInterval && !_.isEqual(refreshInterval, timefilter.getRefreshInterval())) {
        timefilter.setRefreshInterval(_.cloneDeep(refreshInterval));
      }

      if (
        globalFilters &&
        !compareFilters(globalFilters, filterManager.getGlobalFilters(), COMPARE_ALL_OPTIONS)
      ) {
        filterManager.setGlobalFilters(_.cloneDeep(globalFilters));
      }
    }),
  ];

  return () => {
    subs.forEach(s => s.unsubscribe());
  };
};
