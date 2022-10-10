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
  ISyncStateRef,
  ReduxLikeStateContainer,
  syncState,
} from '@kbn/kibana-utils-plugin/public';
import { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { cloneDeep, isEqual } from 'lodash';
import { connectToQueryState, syncQueryStateWithUrl } from '@kbn/data-plugin/public';
import { FilterStateStore } from '@kbn/es-query';
import { DiscoverGridSettings } from '../../../components/discover_grid/types';
import { cleanupUrlState } from '../utils/cleanup_url_state';
import { getStateDefaults } from '../utils/get_state_defaults';
import { handleSourceColumnState } from '../../../utils/state_helpers';
import { AppStateUrl, setState } from './discover_state';
import { DiscoverServices } from '../../../build_services';
import { VIEW_MODE } from '../../../components/view_mode_toggle';
import { getValidFilters } from '../../../utils/get_valid_filters';
import { addLog } from '../../../utils/addLog';

export const APP_STATE_URL_KEY = '_a';

export interface AppStateContainer extends ReduxLikeStateContainer<AppState> {
  getPrevious: () => AppState;
  syncState: () => ISyncStateRef;
  update: (newPartial: AppState, replace?: boolean) => void;
  replace: (newPartial: AppState, merge?: boolean) => Promise<void>;
  push: (newPartial: AppState) => Promise<void>;
  reset: (savedSearch: SavedSearch) => void;
  initAndSync: (currentSavedSearch: SavedSearch) => () => void;
  isEmptyURL: () => boolean;
}

export const { Provider: AppStateProvider, useSelector: useAppStateSelector } =
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
): AppStateContainer => {
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
    reset: (nextSavedSearch: SavedSearch) => {
      addLog('🔗 [appState] reset', nextSavedSearch);
      const resetState = getInitialState(stateStorage, nextSavedSearch, services);
      appStateContainer.set(resetState);
    },
    set: (value: AppState | null) => {
      if (value) {
        previousAppState = { ...appStateContainer.getState() };
        addLog('🔗 [appState] set', { prev: previousAppState, next: value });
        appStateContainer.set(value);
      }
    },
    getPrevious: () => {
      return previousAppState;
    },
    replace: replaceUrlState,
    push: pushUrlState,
    isEmptyURL: () => {
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
    // searchsource is the source of truth
    const dataView = currentSavedSearch.searchSource.getField('index');
    const filters = currentSavedSearch.searchSource.getField('filter');
    const query = currentSavedSearch.searchSource.getField('query');
    const { filterManager, data } = services;
    if (appStateContainer.getState().index !== dataView?.id) {
      // used data view is different than the given by url/state which is invalid
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
    const { stop: stopSyncingGlobalStateWithUrl } = syncQueryStateWithUrl(data.query, stateStorage);

    // some filters may not be valid for this context, so update
    // the filter manager with a modified list of valid filters
    const currentFilters = filterManager.getFilters();
    const validFilters = getValidFilters(dataView!, currentFilters);
    if (!isEqual(currentFilters, validFilters)) {
      filterManager.setFilters(validFilters);
    }

    const { start, stop } = initSyncState();

    replaceUrlState({}).then(() => start());

    return () => {
      stopSyncingQueryAppStateWithStateContainer();
      stopSyncingGlobalStateWithUrl();
      stop();
    };
  };

  return {
    ...enhancedAppContainer,
    syncState: initSyncState,
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
  return handleSourceColumnState(
    savedSearch.id
      ? { ...defaultAppState }
      : {
          ...defaultAppState,
          ...appStateFromUrl,
        },
    services.uiSettings
  );
}
