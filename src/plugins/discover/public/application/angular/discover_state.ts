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
import _, { isEqual } from 'lodash';
import { History } from 'history';
import { IUiSettingsClient, NotificationsStart } from 'kibana/public';
import {
  createStateContainer,
  createKbnUrlStateStorage,
  syncState,
  ReduxLikeStateContainer,
  IKbnUrlStateStorage,
  withNotifyOnErrors,
} from '../../../../kibana_utils/public';
import { esFilters, Filter, IndexPattern, Query } from '../../../../data/public';
import { migrateLegacyQuery } from '../helpers/migrate_legacy_query';
import { getSortArray } from './doc_table';
import { DEFAULT_COLUMNS_SETTING } from '../../../common';
import { SavedSearch } from '../../saved_searches';
import { SortPairArr } from './doc_table/lib/get_sort';

export interface AppState {
  /**
   * Columns displayed in the table
   */
  columns?: string[];
  /**
   * Array of applied filters
   */
  filters?: Filter[];
  /**
   * id of the used index pattern
   */
  index?: string;
  /**
   * Used interval of the histogram
   */
  interval?: string;
  /**
   * Lucence or KQL query
   */
  query?: Query;
  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort?: SortPairArr[];
  /**
   * id of the used saved query
   */
  savedQuery?: string;
}

interface GetStateParams {
  /**
   * Default state used for merging with with URL state to get the initial state
   */
  defaultAppState?: AppState;
  /**
   * Determins the use of long vs. short/hashed urls
   */
  storeInSessionStorage?: boolean;
  /**
   * Browser history
   */
  history: History;

  /**
   * Core's notifications.toasts service
   * In case it is passed in,
   * kbnUrlStateStorage will use it notifying about inner errors
   */
  toasts?: NotificationsStart['toasts'];
}

export interface GetStateReturn {
  /**
   * kbnUrlStateStorage
   */
  kbnUrlStateStorage: IKbnUrlStateStorage;
  /**
   * App state, the _a part of the URL
   */
  appStateContainer: ReduxLikeStateContainer<AppState>;
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
   * Set state in Url using history.replace
   */
  replaceUrlAppState: (newState: Partial<AppState>) => Promise<void>;
  /**
   * Sync state to URL, used for testing
   */
  flushToUrl: () => void;
  /**
   * Reset initial state to the current app state
   */
  resetInitialAppState: () => void;
  /**
   * Return the Appstate before the current app state, useful for diffing changes
   */
  getPreviousAppState: () => AppState;
  /**
   * Returns whether the current app state is different to the initial state
   */
  isAppStateDirty: () => void;
}
const APP_STATE_URL_KEY = '_a';

/**
 * Builds and returns appState and globalState containers and helper functions
 * Used to sync URL with UI state
 */
export function getState({
  defaultAppState = {},
  storeInSessionStorage = false,
  history,
  toasts,
}: GetStateParams): GetStateReturn {
  const stateStorage = createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history,
    ...(toasts && withNotifyOnErrors(toasts)),
  });

  const appStateFromUrl = stateStorage.get(APP_STATE_URL_KEY) as AppState;

  if (appStateFromUrl && appStateFromUrl.query && !appStateFromUrl.query.language) {
    appStateFromUrl.query = migrateLegacyQuery(appStateFromUrl.query);
  }

  let initialAppState = {
    ...defaultAppState,
    ...appStateFromUrl,
  };
  let previousAppState: AppState;
  const appStateContainer = createStateContainer<AppState>(initialAppState);

  const appStateContainerModified = {
    ...appStateContainer,
    set: (value: AppState | null) => {
      if (value) {
        previousAppState = appStateContainer.getState();
        appStateContainer.set(value);
      }
    },
  };

  const { start, stop } = syncState({
    storageKey: APP_STATE_URL_KEY,
    stateContainer: appStateContainerModified,
    stateStorage,
  });

  return {
    kbnUrlStateStorage: stateStorage,
    appStateContainer: appStateContainerModified,
    startSync: start,
    stopSync: stop,
    setAppState: (newPartial: AppState) => setState(appStateContainerModified, newPartial),
    replaceUrlAppState: async (newPartial: AppState = {}) => {
      const state = { ...appStateContainer.getState(), ...newPartial };
      await stateStorage.set(APP_STATE_URL_KEY, state, { replace: true });
    },
    resetInitialAppState: () => {
      initialAppState = appStateContainer.getState();
    },
    getPreviousAppState: () => previousAppState,
    flushToUrl: () => stateStorage.flush(),
    isAppStateDirty: () => !isEqualState(initialAppState, appStateContainer.getState()),
  };
}

export function getStateDefaults(
  savedSearch: SavedSearch,
  indexPattern: IndexPattern,
  config: IUiSettingsClient,
  defaultQuery: {
    query: string;
    language: string;
  }
): AppState {
  const { searchSource } = savedSearch;
  const defaultState: AppState = {
    query: searchSource.getField('query') || defaultQuery,
    sort: getSortArray(savedSearch.sort, indexPattern),
    columns:
      savedSearch.columns.length > 0
        ? savedSearch.columns
        : config.get(DEFAULT_COLUMNS_SETTING).slice(),
    index: indexPattern.id,
    interval: 'auto',
    filters: _.cloneDeep(searchSource.getOwnField('filter')) as Filter[],
  };
  return defaultState;
}

/**
 * Helper function to merge a given new state with the existing state and to set the given state
 * container
 */
export function setState(stateContainer: ReduxLikeStateContainer<AppState>, newState: AppState) {
  const oldState = stateContainer.getState();
  const mergedState = { ...oldState, ...newState };
  if (!isEqualState(oldState, mergedState)) {
    stateContainer.set(mergedState);
  }
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
 * helper function to extract filters of the given state
 * returns a state object without filters and an array of filters
 */
export function splitState(state: AppState = {}) {
  const { filters = [], ...statePartial } = state;
  return { filters, state: statePartial };
}

/**
 * Helper function to compare 2 different state, is needed since comparing filters
 * works differently
 */
export function isEqualState(stateA: AppState, stateB: AppState) {
  if (!stateA && !stateB) {
    return true;
  } else if (!stateA || !stateB) {
    return false;
  }
  const { filters: stateAFilters = [], ...stateAPartial } = stateA;
  const { filters: stateBFilters = [], ...stateBPartial } = stateB;
  return isEqual(stateAPartial, stateBPartial) && isEqualFilters(stateAFilters, stateBFilters);
}
