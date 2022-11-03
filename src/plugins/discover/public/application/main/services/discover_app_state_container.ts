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
  IKbnUrlStateStorage,
  ReduxLikeStateContainer,
  syncState,
} from '@kbn/kibana-utils-plugin/public';
import { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { cloneDeep, isEqual } from 'lodash';
import { connectToQueryState, syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import { FilterStateStore } from '@kbn/es-query';
import { setState } from './discover_state_utils';
import { DiscoverGridSettings } from '../../../components/discover_grid/types';
import { cleanupUrlState } from '../utils/cleanup_url_state';
import { getStateDefaults } from '../utils/get_state_defaults';
import { handleSourceColumnState } from '../../../utils/state_helpers';
import { DiscoverServices } from '../../../build_services';
import { VIEW_MODE } from '../../../components/view_mode_toggle';
import { getValidFilters } from '../../../utils/get_valid_filters';
import { addLog } from '../../../utils/add_log';

export const APP_STATE_URL_KEY = '_a';
export interface AppStateUrl extends Omit<AppState, 'sort'> {
  /**
   * Necessary to take care of legacy links [fieldName,direction]
   */
  sort?: string[][] | [string, string];
}

export interface DiscoverAppStateContainer extends ReduxLikeStateContainer<AppState> {
  /**
   * Returns the state before the actual state
   */
  getPrevious: () => AppState;
  /**
   * Update current state with the given partial state
   * @param newPartial
   * @param replace - update in URL first
   */
  update: (newPartial: AppState, replace?: boolean) => void;
  /**
   * Update URL state value, URL will be updated with a history.replace
   * @param newPartial
   * @param merge - merge newPartial with the current url state
   */
  replace: (newPartial: AppState, merge?: boolean) => Promise<void>;
  /**
   * Update URL state value, URL will be updated with a history.push
   * @param newPartial
   * @param merge - merge newPartial with the current url state
   */
  push: (newPartial: AppState) => Promise<void>;
  /**
   * Update state with new state derived by the given SavedSearch
   * @param savedSearch
   */
  resetBySavedSearch: (savedSearch: SavedSearch) => AppState;
  /**
   * Init default values and start syncing changes state <-> url
   * @param currentSavedSearch
   */
  initAndSync: (currentSavedSearch: SavedSearch) => () => void;
  /**
   * Used to detect if the URL contains state, when loading new or persisted saved searches
   * In true, the given URL state needs to be merged with the state derived from saved search
   */
  isEmptyURL: () => boolean;
}

export const { Provider: DiscoverAppStateProvider, useSelector: useAppStateSelector } =
  createStateContainerReactHelpers<ReduxLikeStateContainer<AppState>>();

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
}

export const getDiscoverAppStateContainer = (
  stateStorage: IKbnUrlStateStorage,
  savedSearch: SavedSearch,
  services: DiscoverServices
): DiscoverAppStateContainer => {
  let previousAppState: AppState = {};
  const initialState = getInitialState(stateStorage, savedSearch, services);
  const appStateContainer = createStateContainer<AppState>(initialState);
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

  const enhancedAppContainer = {
    ...appStateContainer,
    resetBySavedSearch: (nextSavedSearch: SavedSearch) => {
      const nextAppState = getInitialState(stateStorage, nextSavedSearch, services);
      addLog('🔗 [appState] reset appstate by savedsearch', { nextSavedSearch, nextAppState });
      appStateContainer.set(nextAppState);
      return nextAppState;
    },
    set: (value: AppState | null) => {
      if (value) {
        const currentState = appStateContainer.getState();
        if (isEqual(value, currentState)) {
          return;
        }
        previousAppState = { ...appStateContainer.getState() };
        addLog('🔗 [appState] set', { prev: previousAppState, next: value });
        appStateContainer.set(value);
      }
    },
    getPrevious: () => previousAppState,
    replace: replaceUrlState,
    push: pushUrlState,
    isEmptyURL: () => {
      addLog('🔗 [appState] isEmptyURL', stateStorage.get(APP_STATE_URL_KEY));
      debugger;
      return stateStorage.get(APP_STATE_URL_KEY) === null;
    },
    update: (newPartial: AppState, replace = false) => {
      addLog('🔗 [appState] update', { new: newPartial, replace });
      if (replace) {
        return replaceUrlState(newPartial);
      } else {
        previousAppState = { ...appStateContainer.getState() };
        setState(appStateContainer, newPartial);
      }
    },
  };
  const initSyncState = () =>
    syncState({
      storageKey: APP_STATE_URL_KEY,
      stateContainer: enhancedAppContainer,
      stateStorage,
    });

  const initializeAndSync = (currentSavedSearch: SavedSearch) => {
    addLog('🔗 [appState] initializeAndSync', currentSavedSearch);
    const { filterManager, data } = services;

    // searchsource is the source of truth
    const dataView = currentSavedSearch.searchSource.getField('index');
    const filters = currentSavedSearch.searchSource.getField('filter');
    const query = currentSavedSearch.searchSource.getField('query');
    if (appStateContainer.getState().index !== dataView?.id) {
      // used data view is different from the given by url/state which is invalid
      setState(appStateContainer, { index: dataView?.id });
    }
    // sync initial app filters from state to filterManager
    if (Array.isArray(filters) && filters.length) {
      filterManager.setAppFilters(cloneDeep(filters));
    } else {
      filterManager.setAppFilters([]);
    }
    if (query) {
      data.query.queryString.setQuery(query);
    }

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

    // some filters may not be valid for this context, so update
    // the filter manager with a modified list of valid filters
    const currentFilters = filterManager.getFilters();
    const validFilters = getValidFilters(dataView!, currentFilters);
    if (!isEqual(currentFilters, validFilters)) {
      filterManager.setFilters(validFilters);
    }

    const { start, stop } = initSyncState();
    // current state need to be pushed to url
    replaceUrlState({}).then(() => start());

    return () => {
      stopSyncingQueryAppStateWithStateContainer();
      stopSyncingGlobalStateWithUrl();
      stop();
    };
  };

  return {
    ...enhancedAppContainer,
    initAndSync: initializeAndSync,
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
  const initialState = handleSourceColumnState(
    savedSearch.id
      ? { ...defaultAppState }
      : {
          ...defaultAppState,
          ...appStateFromUrl,
        },
    services.uiSettings
  );
  if (appStateFromUrl && appStateFromUrl.interval) {
    initialState.interval = appStateFromUrl.interval;
  }
  return initialState;
}
