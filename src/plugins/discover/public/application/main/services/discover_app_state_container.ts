/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createStateContainer,
  createStateContainerReactHelpers,
  ReduxLikeStateContainer,
} from '@kbn/kibana-utils-plugin/common';
import {
  AggregateQuery,
  COMPARE_ALL_OPTIONS,
  compareFilters,
  Filter,
  FilterCompareOptions,
  FilterStateStore,
  Query,
} from '@kbn/es-query';
import { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { IKbnUrlStateStorage, ISyncStateRef, syncState } from '@kbn/kibana-utils-plugin/public';
import { isEqual, omit } from 'lodash';
import { connectToQueryState, syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import type { DiscoverServices } from '../../../build_services';
import { addLog } from '../../../utils/add_log';
import { cleanupUrlState } from '../utils/cleanup_url_state';
import { getStateDefaults } from '../utils/get_state_defaults';
import { handleSourceColumnState } from '../../../utils/state_helpers';

export const APP_STATE_URL_KEY = '_a';
export interface DiscoverAppStateContainer extends ReduxLikeStateContainer<DiscoverAppState> {
  /**
   * Returns if the current URL is empty
   */
  isEmptyURL: () => boolean;
  /**
   * Returns the previous state, used for diffing e.g. if fetching new data is necessary
   */
  getPrevious: () => DiscoverAppState;
  /**
   * Determines if the current state is different from the initial state
   */
  hasChanged: () => boolean;
  /**
   * Initializes the state by the given saved search and starts syncing the state with the URL
   * @param currentSavedSearch
   */
  initAndSync: (currentSavedSearch: SavedSearch) => () => void;
  /**
   * Replaces the current state in URL with the given state
   * @param newState
   * @param merge if true, the given state is merged with the current state
   */
  replaceUrlState: (newPartial: DiscoverAppState, merge?: boolean) => Promise<void>;
  /**
   * Resets the state container to a given state, clearing the previous state
   */
  resetToState: (state: DiscoverAppState) => void;
  /**
   * Resets the current state to the initial state
   */
  resetInitialState: () => void;
  /**
   * Start syncing the state with the URL
   */
  syncState: () => ISyncStateRef;
  /**
   * Updates the state, if replace is true, a history.replace is performed instead of history.push
   * @param newPartial
   * @param replace
   */
  update: (newPartial: DiscoverAppState, replace?: boolean) => void;

  /*
   * Get updated AppState when given a saved search
   *
   * */
  getAppStateFromSavedSearch: (newSavedSearch: SavedSearch) => Promise<DiscoverAppState>;
}

export interface DiscoverAppState {
  /**
   * Columns displayed in the table
   */
  columns?: string[];
  /**
   * Array of applied filters
   */
  filters?: Filter[];
  /**
   * Data Grid related state
   */
  grid?: DiscoverGridSettings;
  /**
   * Hide chart
   */
  hideChart?: boolean;
  /**
   * id of the used data view
   */
  index?: string;
  /**
   * Used interval of the histogram
   */
  interval?: string;
  /**
   * Lucence or KQL query
   */
  query?: Query | AggregateQuery;
  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort?: string[][];
  /**
   * id of the used saved query
   */
  savedQuery?: string;
  /**
   * Table view: Documents vs Field Statistics
   */
  viewMode?: VIEW_MODE;
  /**
   * Hide mini distribution/preview charts when in Field Statistics mode
   */
  hideAggregatedPreview?: boolean;
  /**
   * Document explorer row height option
   */
  rowHeight?: number;
  /**
   * Document explorer header row height option
   */
  headerRowHeight?: number;
  /**
   * Number of rows in the grid per page
   */
  rowsPerPage?: number;
  /**
   * Custom sample size
   */
  sampleSize?: number;
  /**
   * Breakdown field of chart
   */
  breakdownField?: string;
}

export const { Provider: DiscoverAppStateProvider, useSelector: useAppStateSelector } =
  createStateContainerReactHelpers<ReduxLikeStateContainer<DiscoverAppState>>();

/**
 * This is the app state container for Discover main, it's responsible for syncing state with the URL
 * @param stateStorage
 * @param savedSearch
 * @param services
 */
export const getDiscoverAppStateContainer = async ({
  stateStorage,
  savedSearch,
  services,
}: {
  stateStorage: IKbnUrlStateStorage;
  savedSearch: SavedSearch;
  services: DiscoverServices;
}): Promise<DiscoverAppStateContainer> => {
  let initialState = await getInitialState(stateStorage, savedSearch, services);
  let previousState = initialState;
  const appStateContainer = createStateContainer<DiscoverAppState>(initialState);

  const enhancedAppContainer = {
    ...appStateContainer,
    set: (value: DiscoverAppState | null) => {
      if (value) {
        previousState = appStateContainer.getState();
        appStateContainer.set(value);
      }
    },
  };

  const hasChanged = () => {
    return !isEqualState(initialState, appStateContainer.getState());
  };

  const getAppStateFromSavedSearch = (newSavedSearch: SavedSearch) => {
    return getStateDefaults({
      savedSearch: newSavedSearch,
      services,
    });
  };

  const resetToState = (state: DiscoverAppState) => {
    addLog('[appState] reset state to', state);
    previousState = state;
    appStateContainer.set(state);
  };

  const resetInitialState = () => {
    addLog('[appState] reset initial state to the current state');
    initialState = appStateContainer.getState();
  };

  const replaceUrlState = async (newPartial: DiscoverAppState = {}, merge = true) => {
    addLog('[appState] replaceUrlState', { newPartial, merge });
    const state = merge ? { ...appStateContainer.getState(), ...newPartial } : newPartial;
    await stateStorage.set(APP_STATE_URL_KEY, state, { replace: true });
  };

  const startAppStateUrlSync = () => {
    addLog('[appState] start syncing state with URL');
    return syncState({
      storageKey: APP_STATE_URL_KEY,
      stateContainer: enhancedAppContainer,
      stateStorage,
    });
  };

  const initializeAndSync = (currentSavedSearch: SavedSearch) => {
    addLog('[appState] initialize state and sync with URL', currentSavedSearch);
    const { data } = services;
    const dataView = currentSavedSearch.searchSource.getDataViewLazy();

    if (appStateContainer.getState().index !== dataView?.id) {
      // used data view is different from the given by url/state which is invalid
      setState(appStateContainer, { index: dataView?.id });
    }
    // syncs `_a` portion of url with query services
    const stopSyncingQueryAppStateWithStateContainer = connectToQueryState(
      data.query,
      appStateContainer,
      {
        filters: FilterStateStore.APP_STATE,
        query: true,
      }
    );

    // syncs `_g` portion of url with query services
    const { stop: stopSyncingGlobalStateWithUrl } = syncGlobalQueryStateWithUrl(
      data.query,
      stateStorage
    );

    const { start, stop } = startAppStateUrlSync();
    // current state need to be pushed to url
    replaceUrlState({}).then(() => start());

    return () => {
      stopSyncingQueryAppStateWithStateContainer();
      stopSyncingGlobalStateWithUrl();
      stop();
    };
  };

  const update = (newPartial: DiscoverAppState, replace = false) => {
    addLog('[appState] update', { newPartial, replace });
    if (replace) {
      return replaceUrlState(newPartial);
    } else {
      previousState = { ...appStateContainer.getState() };
      setState(appStateContainer, newPartial);
    }
  };

  const isEmptyURL = () => {
    const urlValue = stateStorage.get(APP_STATE_URL_KEY);
    return urlValue === undefined || urlValue === null;
  };

  const getPrevious = () => previousState;

  return {
    ...enhancedAppContainer,
    isEmptyURL,
    getPrevious,
    hasChanged,
    initAndSync: initializeAndSync,
    resetToState,
    resetInitialState,
    replaceUrlState,
    syncState: startAppStateUrlSync,
    update,
    getAppStateFromSavedSearch,
  };
};

export interface AppStateUrl extends Omit<DiscoverAppState, 'sort'> {
  /**
   * Necessary to take care of legacy links [fieldName,direction]
   */
  sort?: string[][] | [string, string];
}

export async function getInitialState(
  stateStorage: IKbnUrlStateStorage | undefined,
  savedSearch: SavedSearch,
  services: DiscoverServices
) {
  const stateStorageURL = stateStorage?.get(APP_STATE_URL_KEY) as AppStateUrl;
  const defaultAppState = await getStateDefaults({
    savedSearch,
    services,
  });
  return handleSourceColumnState(
    stateStorageURL === null
      ? defaultAppState
      : {
          ...defaultAppState,
          ...cleanupUrlState(stateStorageURL, services.uiSettings),
        },
    services.uiSettings
  );
}

/**
 * Helper function to merge a given new state with the existing state and to set the given state
 * container
 */
export function setState(
  stateContainer: ReduxLikeStateContainer<DiscoverAppState>,
  newState: DiscoverAppState
) {
  addLog('[appstate] setState', { newState });
  const oldState = stateContainer.getState();
  const mergedState = { ...oldState, ...newState };
  if (!isEqualState(oldState, mergedState)) {
    stateContainer.set(mergedState);
  }
}

/**
 * Helper function to compare 2 different filter states
 */
export function isEqualFilters(
  filtersA?: Filter[] | Filter,
  filtersB?: Filter[] | Filter,
  comparatorOptions: FilterCompareOptions = COMPARE_ALL_OPTIONS
) {
  if (!filtersA && !filtersB) {
    return true;
  } else if (!filtersA || !filtersB) {
    return false;
  }
  return compareFilters(filtersA, filtersB, comparatorOptions);
}

/**
 * Helper function to compare 2 different state, is needed since comparing filters
 * works differently
 */
export function isEqualState(
  stateA: DiscoverAppState,
  stateB: DiscoverAppState,
  exclude: string[] = []
) {
  if (!stateA && !stateB) {
    return true;
  } else if (!stateA || !stateB) {
    return false;
  }

  const { filters: stateAFilters = [], ...stateAPartial } = omit(stateA, exclude);
  const { filters: stateBFilters = [], ...stateBPartial } = omit(stateB, exclude);

  return isEqual(stateAPartial, stateBPartial) && isEqualFilters(stateAFilters, stateBFilters);
}
