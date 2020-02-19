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
import {
  createStateContainer,
  IKbnUrlStateStorage,
  syncState,
} from '../../../../kibana_utils/public';
import { COMPARE_ALL_OPTIONS, compareFilters } from '../filter_manager/lib/compare_filters';
import { Filter, RefreshInterval, TimeRange } from '../../../common';
import { QuerySetup, QueryStart } from '../query_service';

const GLOBAL_STATE_STORAGE_KEY = '_g';

export interface QuerySyncState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
  filters?: Filter[];
}

/**
 * Helper utility to set up syncing between query services and url's '_g' query param
 */
export const syncQuery = (queryStart: QueryStart, urlStateStorage: IKbnUrlStateStorage) => {
  const {
    timefilter: { timefilter },
    filterManager,
  } = queryStart;
  // retrieve current state from `_g` url
  const initialStateFromUrl = urlStateStorage.get<QuerySyncState>(GLOBAL_STATE_STORAGE_KEY);

  // remember whether there were info in the URL
  const hasInheritedQueryFromUrl = Boolean(
    initialStateFromUrl && Object.keys(initialStateFromUrl).length
  );

  const {
    querySyncStateContainer,
    stop: stopPullQueryState,
    initialState,
  } = getQueryStateContainer(queryStart, initialStateFromUrl || {});

  const pushQueryStateSubscription = querySyncStateContainer.state$.subscribe(
    ({ time, filters: globalFilters, refreshInterval }) => {
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
    }
  );

  // if there weren't any initial state in url,
  // then put _g key into url
  if (!initialStateFromUrl) {
    urlStateStorage.set<QuerySyncState>(GLOBAL_STATE_STORAGE_KEY, initialState, {
      replace: true,
    });
  }

  // trigger initial syncing from state container to services if needed
  querySyncStateContainer.set(initialState);

  const { start, stop: stopSyncState } = syncState({
    stateStorage: urlStateStorage,
    stateContainer: {
      ...querySyncStateContainer,
      set: state => {
        if (state) {
          // syncState utils requires to handle incoming "null" value
          querySyncStateContainer.set(state);
        }
      },
    },
    storageKey: GLOBAL_STATE_STORAGE_KEY,
  });

  start();
  return {
    stop: () => {
      stopSyncState();
      pushQueryStateSubscription.unsubscribe();
      stopPullQueryState();
    },
    hasInheritedQueryFromUrl,
  };
};

export const getQueryStateContainer = (
  { timefilter: { timefilter }, filterManager }: QuerySetup,
  initialStateOverrides: Partial<QuerySyncState> = {}
) => {
  const defaultState: QuerySyncState = {
    time: timefilter.getTime(),
    refreshInterval: timefilter.getRefreshInterval(),
    filters: filterManager.getGlobalFilters(),
  };

  const initialState: QuerySyncState = {
    ...defaultState,
    ...initialStateOverrides,
  };

  // create state container, which will be used for syncing with syncState() util
  const querySyncStateContainer = createStateContainer(
    initialState,
    {
      setTime: (state: QuerySyncState) => (time: TimeRange) => ({ ...state, time }),
      setRefreshInterval: (state: QuerySyncState) => (refreshInterval: RefreshInterval) => ({
        ...state,
        refreshInterval,
      }),
      setFilters: (state: QuerySyncState) => (filters: Filter[]) => ({
        ...state,
        filters,
      }),
    },
    {
      time: (state: QuerySyncState) => () => state.time,
      refreshInterval: (state: QuerySyncState) => () => state.refreshInterval,
      filters: (state: QuerySyncState) => () => state.filters,
    }
  );

  const subs: Subscription[] = [
    timefilter.getTimeUpdate$().subscribe(() => {
      querySyncStateContainer.transitions.setTime(timefilter.getTime());
    }),
    timefilter.getRefreshIntervalUpdate$().subscribe(() => {
      querySyncStateContainer.transitions.setRefreshInterval(timefilter.getRefreshInterval());
    }),
    filterManager
      .getUpdates$()
      .pipe(
        map(() => filterManager.getGlobalFilters()), // we need to track only global filters here
        filter(newGlobalFilters => {
          // continue only if global filters changed
          // and ignore app state filters
          const oldGlobalFilters = querySyncStateContainer.get().filters;
          return (
            !oldGlobalFilters ||
            !compareFilters(newGlobalFilters, oldGlobalFilters, COMPARE_ALL_OPTIONS)
          );
        })
      )
      .subscribe(newGlobalFilters => {
        querySyncStateContainer.transitions.setFilters(newGlobalFilters);
      }),
  ];

  return {
    querySyncStateContainer,
    stop: () => {
      subs.forEach(s => s.unsubscribe());
    },
    initialState,
  };
};
