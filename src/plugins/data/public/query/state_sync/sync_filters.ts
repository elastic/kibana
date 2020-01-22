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
import { filter, map } from 'rxjs/operators';
import {
  createStateContainer,
  IKbnUrlStateStorage,
  syncState,
} from '../../../../kibana_utils/public';
import { COMPARE_ALL_OPTIONS, compareFilters } from '../filter_manager/lib/compare_filters';
import { RefreshInterval, TimeRange, esFilters } from '../../../common';
import { FilterManager } from '../filter_manager';
import { TimefilterContract } from '../timefilter';

const GLOBAL_STATE_STORAGE_KEY = '_g';

export interface FiltersSyncState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
  filters?: esFilters.Filter[];
}

/**
 * Helper function to set up syncing between Filter & Time Filter services with url's '_g' query param
 * @param urlStateStorage - url state storage to use
 * @param filterManager - filter manager instance
 * @param timeFilter - time filter instance
 */
export const syncFilters = (
  urlStateStorage: IKbnUrlStateStorage,
  filterManager: FilterManager,
  timeFilter: TimefilterContract
) => {
  const defaultState: FiltersSyncState = {
    time: timeFilter.getTime(),
    refreshInterval: timeFilter.getRefreshInterval(),
    filters: filterManager.getGlobalFilters(),
  };

  const initialStateFromUrl = urlStateStorage.get<FiltersSyncState>(GLOBAL_STATE_STORAGE_KEY);

  // remember whether there were info in the URL
  const hasInheritedFiltersFromUrl = Boolean(
    initialStateFromUrl && Object.keys(initialStateFromUrl).length
  );

  const initialState: FiltersSyncState = {
    ...defaultState,
    ...initialStateFromUrl,
  };

  const filtersSyncStateContainer = createStateContainer(
    initialState,
    {
      setTime: (state: FiltersSyncState) => (time: TimeRange) => ({ ...state, time }),
      setRefreshInterval: (state: FiltersSyncState) => (refreshInterval: RefreshInterval) => ({
        ...state,
        refreshInterval,
      }),
      setFilters: (state: FiltersSyncState) => (filters: esFilters.Filter[]) => ({
        ...state,
        filters,
      }),
    },
    {
      time: (state: FiltersSyncState) => () => state.time,
      refreshInterval: (state: FiltersSyncState) => () => state.refreshInterval,
      filters: (state: FiltersSyncState) => () => state.filters,
    }
  );

  const subs: Subscription[] = [
    timeFilter.getTimeUpdate$().subscribe(() => {
      filtersSyncStateContainer.transitions.setTime(timeFilter.getTime());
    }),
    timeFilter.getRefreshIntervalUpdate$().subscribe(() => {
      filtersSyncStateContainer.transitions.setRefreshInterval(timeFilter.getRefreshInterval());
    }),
    filterManager
      .getUpdates$()
      .pipe(
        map(() => filterManager.getGlobalFilters()),
        filter(newGlobalFilters => {
          // continue only if global filters changed
          // and ignore app state filters
          const oldGlobalFilters = filtersSyncStateContainer.get().filters;
          return (
            !oldGlobalFilters ||
            !compareFilters(newGlobalFilters, oldGlobalFilters, COMPARE_ALL_OPTIONS)
          );
        })
      )
      .subscribe(newGlobalFilters => {
        filtersSyncStateContainer.transitions.setFilters(newGlobalFilters);
      }),
    filtersSyncStateContainer.state$.subscribe(
      ({ time, filters: globalFilters, refreshInterval }) => {
        if (time && !_.isEqual(time, timeFilter.getTime())) {
          timeFilter.setTime(_.cloneDeep(time));
        }

        if (refreshInterval && !_.isEqual(refreshInterval, timeFilter.getRefreshInterval())) {
          timeFilter.setRefreshInterval(_.cloneDeep(refreshInterval));
        }

        if (
          globalFilters &&
          !compareFilters(globalFilters, filterManager.getGlobalFilters(), COMPARE_ALL_OPTIONS)
        ) {
          globalFilters = _.cloneDeep(globalFilters);
          FilterManager.setFiltersStore(globalFilters, esFilters.FilterStateStore.GLOBAL_STATE);
          // have to make sure we don't accidentally remove application filters here
          filterManager.setFilters([...globalFilters, ...filterManager.getAppFilters()]);
        }
      }
    ),
  ];

  if (!initialStateFromUrl) {
    urlStateStorage.set<FiltersSyncState>(GLOBAL_STATE_STORAGE_KEY, initialState, {
      replace: true,
    });
  }

  // trigger syncing from state container to services if needed
  filtersSyncStateContainer.set(initialState);

  const { start, stop } = syncState({
    stateStorage: urlStateStorage,
    stateContainer: {
      ...filtersSyncStateContainer,
      set: state => {
        filtersSyncStateContainer.set({
          ...filtersSyncStateContainer.get(),
          ...state,
        });
      },
    },
    storageKey: GLOBAL_STATE_STORAGE_KEY,
  });

  start();
  return {
    stop: () => {
      subs.forEach(s => s.unsubscribe());
      stop();
    },
    hasInheritedFiltersFromUrl,
  };
};
