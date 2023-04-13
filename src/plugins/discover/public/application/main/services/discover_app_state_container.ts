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
  FilterStateStore,
  Query,
} from '@kbn/es-query';
import { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { IKbnUrlStateStorage, ISyncStateRef, syncState } from '@kbn/kibana-utils-plugin/public';
import { cloneDeep, isEqual } from 'lodash';
import { connectToQueryState, syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import { DiscoverServices } from '../../../build_services';
import { addLog } from '../../../utils/add_log';
import { getValidFilters } from '../../../utils/get_valid_filters';
import { cleanupUrlState } from '../utils/cleanup_url_state';
import { getStateDefaults } from '../utils/get_state_defaults';
import { handleSourceColumnState } from '../../../utils/state_helpers';
import { DiscoverGridSettings } from '../../../components/discover_grid/types';

export const APP_STATE_URL_KEY = '_a';
export interface DiscoverAppStateContainer extends ReduxLikeStateContainer<DiscoverAppState> {
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
  replaceUrlState: (newPartial: DiscoverAppState, merge?: boolean) => void;
  /**
   * Resets the state by the given saved search
   * @param savedSearch
   */
  resetWithSavedSearch: (savedSearch: SavedSearch) => void;
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
   * Number of rows in the grid per page
   */
  rowsPerPage?: number;
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
export const getDiscoverAppStateContainer = ({
  stateStorage,
  savedSearch,
  services,
}: {
  stateStorage: IKbnUrlStateStorage;
  savedSearch: SavedSearch;
  services: DiscoverServices;
}): DiscoverAppStateContainer => {
  let previousState: DiscoverAppState = {};
  let initialState = getInitialState(stateStorage, savedSearch, services);
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
    addLog('[appState] startAppStateUrlSync');
    return syncState({
      storageKey: APP_STATE_URL_KEY,
      stateContainer: enhancedAppContainer,
      stateStorage,
    });
  };

  const initializeAndSync = (currentSavedSearch: SavedSearch) => {
    addLog('[appState] initializeAndSync', currentSavedSearch);
    const dataView = currentSavedSearch.searchSource.getField('index')!;
    if (appStateContainer.getState().index !== dataView.id) {
      // used data view is different from the given by url/state which is invalid
      setState(appStateContainer, { index: dataView.id });
    }
    // sync initial app filters from state to filterManager
    const filters = appStateContainer.getState().filters || [];
    if (filters) {
      services.filterManager.setAppFilters(cloneDeep(filters));
    }
    const query = appStateContainer.getState().query;
    if (query) {
      services.data.query.queryString.setQuery(query);
    }

    const stopSyncingQueryAppStateWithStateContainer = connectToQueryState(
      services.data.query,
      appStateContainer,
      {
        filters: FilterStateStore.APP_STATE,
        query: true,
      }
    );

    // syncs `_g` portion of url with query services
    const { stop: stopSyncingGlobalStateWithUrl } = syncGlobalQueryStateWithUrl(
      services.data.query,
      stateStorage
    );

    // some filters may not be valid for this context, so update
    // the filter manager with a modified list of valid filters
    const currentFilters = services.filterManager.getFilters();
    const validFilters = getValidFilters(dataView, currentFilters);
    if (!isEqual(currentFilters, validFilters)) {
      services.filterManager.setFilters(validFilters);
    }

    const { start, stop } = startAppStateUrlSync();

    replaceUrlState({}).then(() => {
      start();
    });

    return () => {
      stopSyncingQueryAppStateWithStateContainer();
      stopSyncingGlobalStateWithUrl();
      stop();
    };
  };

  const resetWithSavedSearch = (nextSavedSearch: SavedSearch) => {
    addLog('[appState] reset to saved search', { nextSavedSearch });
    const nextAppState = getInitialState(stateStorage, nextSavedSearch, services);
    appStateContainer.set(nextAppState);
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

  const getPrevious = () => previousState;

  return {
    ...enhancedAppContainer,
    getPrevious,
    hasChanged,
    initAndSync: initializeAndSync,
    resetWithSavedSearch,
    resetInitialState,
    replaceUrlState,
    syncState: startAppStateUrlSync,
    update,
  };
};

export interface AppStateUrl extends Omit<DiscoverAppState, 'sort'> {
  /**
   * Necessary to take care of legacy links [fieldName,direction]
   */
  sort?: string[][] | [string, string];
}

export const GLOBAL_STATE_URL_KEY = '_g';

function getInitialState(
  stateStorage: IKbnUrlStateStorage,
  savedSearch: SavedSearch,
  services: DiscoverServices
) {
  const appStateFromUrl = cleanupUrlState(stateStorage.get(APP_STATE_URL_KEY) as AppStateUrl);
  const defaultAppState = getStateDefaults({
    savedSearch,
    services,
  });
  return handleSourceColumnState(
    {
      ...defaultAppState,
      ...appStateFromUrl,
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
export function isEqualFilters(filtersA?: Filter[] | Filter, filtersB?: Filter[] | Filter) {
  if (!filtersA && !filtersB) {
    return true;
  } else if (!filtersA || !filtersB) {
    return false;
  }
  return compareFilters(filtersA, filtersB, COMPARE_ALL_OPTIONS);
}

/**
 * Helper function to compare 2 different state, is needed since comparing filters
 * works differently
 */
export function isEqualState(stateA: DiscoverAppState, stateB: DiscoverAppState) {
  if (!stateA && !stateB) {
    return true;
  } else if (!stateA || !stateB) {
    return false;
  }
  const { filters: stateAFilters = [], ...stateAPartial } = stateA;
  const { filters: stateBFilters = [], ...stateBPartial } = stateB;
  return isEqual(stateAPartial, stateBPartial) && isEqualFilters(stateAFilters, stateBFilters);
}
