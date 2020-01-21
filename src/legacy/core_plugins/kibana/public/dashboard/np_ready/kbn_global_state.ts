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
  esFilters,
  FilterManager,
  RefreshInterval,
  TimefilterContract,
  TimeRange,
} from '../../../../../../plugins/data/public';
import {
  createStateContainer,
  IKbnUrlStateStorage,
  syncState,
} from '../../../../../../plugins/kibana_utils/public';
import {
  compareFilters,
  COMPARE_ALL_OPTIONS,
  // this whole file will soon be deprecated by new state management.
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../plugins/data/public/query/filter_manager/lib/compare_filters';

const GLOBAL_STATE_STORAGE_KEY = '_g';

export interface KbnGlobalState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
  filters?: esFilters.Filter[];
}

// this should go away after: https://github.com/elastic/kibana/issues/55339
// is resolved
export const initGlobalState = (
  urlStateStorage: IKbnUrlStateStorage,
  filterManager: FilterManager,
  timeFilter: TimefilterContract
) => {
  const defaultState: KbnGlobalState = {
    time: timeFilter.getTime(),
    refreshInterval: timeFilter.getRefreshInterval(),
    filters: filterManager.getGlobalFilters(),
  };

  const initialStateFromUrl = urlStateStorage.get<KbnGlobalState>(GLOBAL_STATE_STORAGE_KEY);

  // remember whether there were info in the URL
  const hasInheritedGlobalState = Boolean(
    initialStateFromUrl && Object.keys(initialStateFromUrl).length
  );

  const initialState: KbnGlobalState = {
    ...defaultState,
    ...initialStateFromUrl,
  };

  const globalStateContainer = createStateContainer(
    initialState,
    {
      setTime: (state: KbnGlobalState) => (time: TimeRange) => ({ ...state, time }),
      setRefreshInterval: (state: KbnGlobalState) => (refreshInterval: RefreshInterval) => ({
        ...state,
        refreshInterval,
      }),
      setFilters: (state: KbnGlobalState) => (filters: esFilters.Filter[]) => ({
        ...state,
        filters,
      }),
    },
    {
      time: (state: KbnGlobalState) => () => state.time,
      refreshInterval: (state: KbnGlobalState) => () => state.refreshInterval,
      filters: (state: KbnGlobalState) => () => state.filters,
    }
  );

  const subs: Subscription[] = [
    timeFilter.getTimeUpdate$().subscribe(() => {
      globalStateContainer.transitions.setTime(timeFilter.getTime());
    }),
    timeFilter.getRefreshIntervalUpdate$().subscribe(() => {
      globalStateContainer.transitions.setRefreshInterval(timeFilter.getRefreshInterval());
    }),
    filterManager
      .getUpdates$()
      .pipe(
        map(() => filterManager.getGlobalFilters()),
        filter(newGlobalFilters => {
          // continue only if global filters changed
          // and ignore app state filters
          const oldGlobalFilters = globalStateContainer.get().filters;
          return (
            !oldGlobalFilters ||
            !compareFilters(newGlobalFilters, oldGlobalFilters, COMPARE_ALL_OPTIONS)
          );
        })
      )
      .subscribe(newGlobalFilters => {
        globalStateContainer.transitions.setFilters(newGlobalFilters);
      }),
    globalStateContainer.state$
      .pipe(map(state => _.cloneDeep(state))) // state in state container is 'frozen', but services implementations are mutating it
      .subscribe(({ time, filters: globalFilters, refreshInterval }) => {
        if (time && !_.isEqual(time, timeFilter.getTime())) {
          timeFilter.setTime(time);
        }

        if (refreshInterval && !_.isEqual(refreshInterval, timeFilter.getRefreshInterval())) {
          timeFilter.setRefreshInterval(refreshInterval);
        }

        if (
          globalFilters &&
          !compareFilters(globalFilters, filterManager.getGlobalFilters(), COMPARE_ALL_OPTIONS)
        ) {
          // have to make sure we don't accidentally remove application filters here
          FilterManager.setFiltersStore(globalFilters, esFilters.FilterStateStore.GLOBAL_STATE);
          filterManager.setFilters([...globalFilters, ...filterManager.getAppFilters()]);
        }
      }),
  ];

  if (!initialStateFromUrl) {
    urlStateStorage.set<KbnGlobalState>(GLOBAL_STATE_STORAGE_KEY, initialState, { replace: true });
  }

  // trigger syncing from state container to services if needed
  globalStateContainer.set(initialState);

  const { start, stop } = syncState({
    stateStorage: urlStateStorage,
    stateContainer: {
      ...globalStateContainer,
      set: state => {
        globalStateContainer.set({
          ...globalStateContainer.get(),
          ...state,
        });
      },
    },
    storageKey: GLOBAL_STATE_STORAGE_KEY,
  });

  start();
  return {
    destroy: () => {
      subs.forEach(s => s.unsubscribe());
      stop();
    },
    hasInheritedGlobalState,
  };
};
