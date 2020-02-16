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
import { filter } from 'rxjs/operators';
import _ from 'lodash';
import { BaseStateContainer } from '../../../../kibana_utils/public';
import { COMPARE_ALL_OPTIONS, compareFilters } from '../filter_manager/lib/compare_filters';
import { QuerySetup, QueryStart } from '../query_service';
import { QueryGlobalState } from './types';

/**
 * Helper to setup two-way syncing of global data and a state container
 * @param QueryService: either setup or start
 * @param stateContainer to use for syncing
 */
export const connectToQueryGlobalState = <S extends QueryGlobalState>(
  {
    timefilter: { timefilter },
    filterManager,
    global$,
  }: Pick<QueryStart | QuerySetup, 'timefilter' | 'filterManager' | 'global$'>,
  globalState: BaseStateContainer<S>
) => {
  let updateInProgress = false;
  function shouldSync() {
    if (updateInProgress) return false;
    const { filters, refreshInterval, time } = globalState.get();
    if (!filters) return true;
    const areGlobalFiltersEqual = compareFilters(
      filters,
      filterManager.getGlobalFilters(),
      COMPARE_ALL_OPTIONS
    );
    if (!areGlobalFiltersEqual) return true;

    const areRefreshIntervalsEqual = _.isEqual(refreshInterval, timefilter.getRefreshInterval());
    if (!areRefreshIntervalsEqual) return true;

    const areTimesEqual = _.isEqual(time, timefilter.getTime());
    if (!areTimesEqual) return true;

    return false;
  }

  // initial syncing
  // TODO:
  // data services take precedence, this seems like a good default,
  // and apps could anyway set their own value after initialisation,
  // but maybe maybe this should be a configurable option?
  if (shouldSync()) {
    globalState.set({
      ...globalState.get(),
      filters: filterManager.getGlobalFilters(),
      time: timefilter.getTime(),
      refreshInterval: timefilter.getRefreshInterval(),
    });
  }

  const subs: Subscription[] = [
    global$.pipe(filter(shouldSync)).subscribe(newGlobalQueryState => {
      globalState.set({ ...globalState.get(), ...newGlobalQueryState });
    }),
    globalState.state$.subscribe(({ time, filters: globalFilters, refreshInterval }) => {
      updateInProgress = true;
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

      updateInProgress = false;
    }),
  ];

  return () => {
    subs.forEach(s => s.unsubscribe());
  };
};
