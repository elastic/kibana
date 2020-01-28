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

export interface QueryGlobalState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
  filters?: esFilters.Filter[];
}

/**
 * Helper utility to sync global data from query services: time, refreshInterval, global (pinned) filters
 * with state container
 * @param QueryStart
 * @param stateContainer
 */
export const connectToQueryGlobalState = <S extends QueryGlobalState>(
  { timefilter: { timefilter }, filterManager }: QueryStart,
  globalState: BaseStateContainer<S>
) => {
  // initial syncing
  // TODO:
  // data services take precedence, this seems like a good default,
  // and apps could anyway set their own value after initialisation,
  // but maybe maybe this should be a configurable option?
  globalState.set({
    ...globalState.get(),
    filters: filterManager.getGlobalFilters(),
    time: timefilter.getTime(),
    refreshInterval: timefilter.getRefreshInterval(),
  } as S);

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
        // we need to track only global filters here
        map(() => filterManager.getGlobalFilters()),
        // continue only if global filters changed
        // and ignore app state filters
        filter(
          newGlobalFilters =>
            !compareFilters(newGlobalFilters, globalState.get().filters || [], COMPARE_ALL_OPTIONS)
        )
      )
      .subscribe(newGlobalFilters => {
        globalState.set({ ...globalState.get(), filters: newGlobalFilters } as S);
      }),
    globalState.state$.subscribe(({ time, filters: globalFilters, refreshInterval }) => {
      // cloneDeep is required because services are mutating passed objects
      // and state in state container is frozen
      time = time || timefilter.getTimeDefaults();
      if (!_.isEqual(time, timefilter.getTime())) {
        timefilter.setTime(_.cloneDeep(time));
      }

      refreshInterval = refreshInterval || timefilter.getRefreshIntervalDefaults();
      if (!_.isEqual(refreshInterval, timefilter.getRefreshInterval())) {
        timefilter.setRefreshInterval(_.cloneDeep(refreshInterval));
      }

      globalFilters = globalFilters || [];
      if (!compareFilters(globalFilters, filterManager.getGlobalFilters(), COMPARE_ALL_OPTIONS)) {
        filterManager.setGlobalFilters(_.cloneDeep(globalFilters));
      }
    }),
  ];

  return () => {
    subs.forEach(s => s.unsubscribe());
  };
};
