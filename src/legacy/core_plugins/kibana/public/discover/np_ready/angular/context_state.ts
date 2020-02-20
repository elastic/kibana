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
import { createBrowserHistory, History } from 'history';
import {
  createStateContainer,
  createKbnUrlStateStorage,
  syncStates,
  BaseStateContainer,
} from '../../../../../../../plugins/kibana_utils/public';
import { esFilters, FilterManager, Filter } from '../../../../../../../plugins/data/public';

interface AppState {
  /**
   * Columns displayed in the table, cannot be changed by UI, just in discover's main app
   */
  columns: string[];
  /**
   * Array of filters
   */
  filters: Filter[];
  /**
   * Number of records to be fetched before anchor records (newer records)
   */
  predecessorCount: number;
  /**
   * Sorting of the records to be fetched, assumed to be a legacy parameter
   */
  sort: string[];
  /**
   * Number of records to be fetched after the anchor records (older records)
   */
  successorCount: number;
}

interface GlobalState {
  /**
   * Array of filters
   */
  filters: Filter[];
}

interface GetStateParams {
  /**
   * Number of records to be fetched when 'Load' link/button is clicked
   */
  defaultStepSize: string;
  /**
   * The timefield used for sorting
   */
  timeFieldName: string;
  /**
   * Determins the use of long vs. short/hashed urls
   */
  storeInSessionStorage?: boolean;
  /**
   * Browser history used for testing
   */
  history?: History;
}

interface GetStateReturn {
  /**
   * Global state, the _g part of the URL
   */
  globalState: BaseStateContainer<GlobalState>;
  /**
   * App state, the _a part of the URL
   */
  appState: BaseStateContainer<AppState>;
  /**
   * Start sync between state and URL
   */
  startSync: () => void;
  /**
   * Stop sync between state and URL
   */
  stopSync: () => void;
  /**
   * Set app state to with a partial new app state
   */
  setAppState: (newState: Partial<AppState>) => void;
  /**
   * Get all filters, global and app state
   */
  getFilters: () => Filter[];
  /**
   * Set global state and app state filters by the given FilterManager instance
   * @param filterManager
   */
  setFilters: (filterManager: FilterManager) => void;
  /**
   * sync state to URL, used for testing
   */
  flushToUrl: () => void;
}
const GLOBAL_STATE_URL_KEY = '_g';
const APP_STATE_URL_KEY = '_a';

/**
 * Builds and returns appState and globalState containers
 * provides helper functions to start/stop syncing with URL
 */
export function getState({
  defaultStepSize,
  timeFieldName,
  storeInSessionStorage = false,
  history,
}: GetStateParams): GetStateReturn {
  const stateStorage = createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history: history ? history : createBrowserHistory(),
  });

  const globalStateInitial = stateStorage.get(GLOBAL_STATE_URL_KEY) as GlobalState;
  const globalStateContainer = createStateContainer<GlobalState>(globalStateInitial);

  const appStateFromUrl = stateStorage.get(APP_STATE_URL_KEY) as AppState;
  const appStateInitial = createInitialAppState(defaultStepSize, timeFieldName, appStateFromUrl);
  const appStateContainer = createStateContainer<AppState>(appStateInitial);

  const { start, stop } = syncStates([
    {
      storageKey: GLOBAL_STATE_URL_KEY,
      stateContainer: {
        ...globalStateContainer,
        ...{
          set: (value: GlobalState | null) => {
            if (value) {
              globalStateContainer.set(value);
            }
          },
        },
      },
      stateStorage,
    },
    {
      storageKey: APP_STATE_URL_KEY,
      stateContainer: {
        ...appStateContainer,
        ...{
          set: (value: AppState | null) => {
            if (value) {
              appStateContainer.set(value);
            }
          },
        },
      },
      stateStorage,
    },
  ]);

  return {
    globalState: globalStateContainer,
    appState: appStateContainer,
    startSync: start,
    stopSync: stop,
    setAppState: (newState: Partial<AppState>) => {
      const oldState = appStateContainer.getState();
      const mergedState = { ...oldState, ...newState };

      if (!isEqualState(oldState, mergedState)) {
        appStateContainer.set(mergedState);
      }
    },
    getFilters: () => [
      ...getFilters(globalStateContainer.getState()),
      ...getFilters(appStateContainer.getState()),
    ],
    setFilters: (filterManager: FilterManager) => {
      // global state filters
      const globalFilters = filterManager.getGlobalFilters();
      const globalFilterChanged = !isEqualFilters(
        globalFilters,
        getFilters(globalStateContainer.getState())
      );
      if (globalFilterChanged) {
        globalStateContainer.set({ filters: globalFilters });
      }
      // app state filters
      const appFilters = filterManager.getAppFilters();
      const appFilterChanged = !isEqualFilters(
        appFilters,
        getFilters(appStateContainer.getState())
      );
      if (appFilterChanged) {
        appStateContainer.set({ ...appStateContainer.getState(), ...{ filters: appFilters } });
      }
    },
    // helper function just needed for testing
    flushToUrl: () => stateStorage.flush(),
  };
}

/**
 * Helper function to compare 2 different filter states
 */
export function isEqualFilters(filtersA: Filter[], filtersB: Filter[]) {
  if (!filtersA && !filtersB) {
    return true;
  } else if (!filtersA || !filtersB) {
    return false;
  }
  return esFilters.compareFilters(filtersA, filtersB, esFilters.COMPARE_ALL_OPTIONS);
}

/**
 * Helper function to compare 2 different states, is needed since comparing filters
 * works differently, doesn't work with _.isEqual
 */
function isEqualState(stateA: AppState | GlobalState, stateB: AppState | GlobalState) {
  if (!stateA && !stateB) {
    return true;
  } else if (!stateA || !stateB) {
    return false;
  }
  const { filters: stateAFilters = [], ...stateAPartial } = stateA;
  const { filters: stateBFilters = [], ...stateBPartial } = stateB;
  return (
    _.isEqual(stateAPartial, stateBPartial) &&
    esFilters.compareFilters(stateAFilters, stateBFilters, esFilters.COMPARE_ALL_OPTIONS)
  );
}

/**
 * Helper function to return array of filter object of a given state
 */
function getFilters(state: AppState | GlobalState): Filter[] {
  if (!state || !Array.isArray(state.filters)) {
    return [];
  }
  return state.filters;
}

/**
 * Helper function to return the initial app state, which is a merged object of url state and
 * default state. The default size is the default number of successor/predecessor records to fetch
 */
function createInitialAppState(
  defaultSize: string,
  timeFieldName: string,
  urlState: AppState
): AppState {
  const defaultState = {
    columns: ['_source'],
    filters: [],
    predecessorCount: parseInt(defaultSize, 10),
    sort: [timeFieldName, 'desc'],
    successorCount: parseInt(defaultSize, 10),
  };
  if (typeof urlState !== 'object') {
    return defaultState;
  }

  return {
    ...defaultState,
    ...urlState,
  };
}
