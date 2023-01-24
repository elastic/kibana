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
import { AggregateQuery, Filter, FilterStateStore, Query } from '@kbn/es-query';
import { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { IKbnUrlStateStorage, ISyncStateRef, syncState } from '@kbn/kibana-utils-plugin/public';
import { cloneDeep, isEqual } from 'lodash';
import { connectToQueryState, syncQueryStateWithUrl } from '@kbn/data-plugin/public';
import { DiscoverServices } from '../../../build_services';
import { addLog } from '../../../utils/add_log';
import { getValidFilters } from '../../../utils/get_valid_filters';
import { cleanupUrlState } from '../utils/cleanup_url_state';
import { getStateDefaults } from '../utils/get_state_defaults';
import { handleSourceColumnState } from '../../../utils/state_helpers';
import { APP_STATE_URL_KEY, AppStateUrl, isEqualState, setState } from './discover_state';
import { DiscoverGridSettings } from '../../../components/discover_grid/types';

export interface DiscoverAppStateContainer extends ReduxLikeStateContainer<AppState> {
  getPrevious: () => AppState;
  hasChanged: () => boolean;
  initAndSync: (currentSavedSearch: SavedSearch) => () => void;
  isEmptyURL: () => boolean;
  push: (newPartial: AppState) => Promise<void>;
  replace: (newPartial: AppState, merge?: boolean) => Promise<void>;
  reset: (savedSearch: SavedSearch) => void;
  resetInitialState: () => void;
  syncState: () => ISyncStateRef;
  update: (newPartial: AppState, replace?: boolean) => void;
}

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
  createStateContainerReactHelpers<ReduxLikeStateContainer<AppState>>();

export const getDiscoverAppStateContainer = (
  stateStorage: IKbnUrlStateStorage,
  savedSearch: SavedSearch,
  services: DiscoverServices
): DiscoverAppStateContainer => {
  let previousState: AppState = {};
  let initialState = getInitialState(stateStorage, savedSearch, services);
  const appStateContainer = createStateContainer<AppState>(initialState);

  const enhancedAppContainer = {
    ...appStateContainer,
    set: (value: AppState | null) => {
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
    initialState = appStateContainer.getState();
  };

  const replaceUrlState = async (newPartial: AppState = {}, merge = true) => {
    addLog('🔗 [appState] replaceUrlState', { newPartial, merge });
    const state = merge ? { ...appStateContainer.getState(), ...newPartial } : newPartial;
    await stateStorage.set(APP_STATE_URL_KEY, state, { replace: true });
  };
  const pushUrlState = async (newPartial: AppState) => {
    addLog('🔗 [appState] pushUrlState', { newPartial });
    const state = { ...appStateContainer.getState(), ...newPartial };
    await stateStorage.set(APP_STATE_URL_KEY, state, { replace: false });
  };

  const startAppStateUrlSync = () => {
    addLog('🔗 [appState] startUrlSync');
    return syncState({
      storageKey: APP_STATE_URL_KEY,
      stateContainer: enhancedAppContainer,
      stateStorage,
    });
  };

  const initializeAndSync = (currentSavedSearch: SavedSearch) => {
    addLog('🔗 [appState] initializeAndSync', currentSavedSearch);
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
    const { stop: stopSyncingGlobalStateWithUrl } = syncQueryStateWithUrl(
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

  const resetBySavedSearch = (nextSavedSearch: SavedSearch) => {
    addLog('🔗 [appState] reset to saved search', { nextSavedSearch });
    const nextAppState = getInitialState(stateStorage, nextSavedSearch, services);
    appStateContainer.set(nextAppState);
  };

  const update = (newPartial: AppState, replace = false) => {
    addLog('🔗 [appState] update', { new: newPartial, replace });
    if (replace) {
      return replaceUrlState(newPartial);
    } else {
      previousState = { ...appStateContainer.getState() };
      setState(appStateContainer, newPartial);
    }
  };

  const isEmptyURL = () => {
    return stateStorage.get(APP_STATE_URL_KEY) === null;
  };

  const getPrevious = () => previousState;

  return {
    ...enhancedAppContainer,
    getPrevious,
    hasChanged,
    initAndSync: initializeAndSync,
    isEmptyURL,
    push: pushUrlState,
    replace: replaceUrlState,
    reset: resetBySavedSearch,
    resetInitialState,
    syncState: startAppStateUrlSync,
    update,
  };
};

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
