/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { History } from 'history';
import { COMPARE_ALL_OPTIONS, compareFilters, Filter } from '@kbn/es-query';
import {
  createKbnUrlStateStorage,
  IKbnUrlStateStorage,
  ReduxLikeStateContainer,
  StateContainer,
  withNotifyOnErrors,
} from '@kbn/kibana-utils-plugin/public';
import {
  DataPublicPluginStart,
  FilterManager,
  QueryState,
  SearchSessionInfoProvider,
} from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { getEmptySavedSearch, SavedSearch } from '@kbn/saved-search-plugin/public';
import { loadDataView, resolveDataView } from '../utils/resolve_data_view';
import { DataStateContainer, getDataStateContainer } from './discover_data_state_container';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { DiscoverAppLocatorParams, DISCOVER_APP_LOCATOR } from '../../../../common';
import {
  AppState,
  DiscoverAppStateContainer,
  getDiscoverAppStateContainer,
} from './discover_app_state_container';
import {
  getInternalStateContainer,
  InternalStateContainer,
} from './discover_internal_state_container';
import { DiscoverServices } from '../../../build_services';
import { getSavedSearchContainer, SavedSearchContainer } from './discover_saved_search_container';

export interface AppStateUrl extends Omit<AppState, 'sort'> {
  /**
   * Necessary to take care of legacy links [fieldName,direction]
   */
  sort?: string[][] | [string, string];
}

interface DiscoverStateContainerParams {
  /**
   * Browser history
   */
  history: History;
  /**
   * The current savedSearch
   */
  savedSearch: SavedSearch;
  /**
   * core ui settings service
   */
  services: DiscoverServices;
}

export interface DiscoverStateContainer {
  /**
   * kbnUrlStateStorage
   */
  kbnUrlStateStorage: IKbnUrlStateStorage;
  /**
   * App state, the _a part of the URL
   */
  appState: DiscoverAppStateContainer;
  /**
   * Internal state that's used at several places in the UI
   */
  internalState: InternalStateContainer;
  /**
   * State of saved search, the saved object of Discover
   */
  savedSearchState: SavedSearchContainer;
  /**
   * Service for handling search sessions
   */
  searchSessionManager: DiscoverSearchSessionManager;
  /**
   * Data fetching related state
   **/
  dataState: DataStateContainer;
  /**
   * Initialize state with filters and query,  start state syncing
   */
  initializeAndSync: (
    dataView: DataView,
    filterManager: FilterManager,
    data: DataPublicPluginStart
  ) => () => void;
  /**
   * Start sync between state and URL -- only used for testing
   */
  startSync: () => () => void;
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
  isAppStateDirty: () => boolean;
  /**
   * Reset AppState by the given savedSearch discarding all changes
   */
  resetAppState: (nextSavedSearch: SavedSearch) => void;
  /**
   * Pause the auto refresh interval without pushing an entry to history
   */
  pauseAutoRefreshInterval: () => Promise<void>;
  /**
   * functions executed by UI
   */
  actions: {
    /**
     * Set the currently selected data view
     */
    setDataView: (dataView: DataView) => void;
    /**
     * Load the data view of the given id
     * A fallback data view is returned, given there's no match
     * This is usually the default data view
     * @param dataViewId
     * @param savedSearch
     */
    loadAndResolveDataView: (
      dataViewId: string,
      savedSearch: SavedSearch
    ) => Promise<{ fallback: boolean; dataView: DataView }>;
    /**
     * Load current list of data views, add them to internal state
     */
    loadDataViewList: () => Promise<void>;
    /**
     * Set new adhoc data view list
     */
    setAdHocDataViews: (dataViews: DataView[]) => void;
    /**
     * Append a given ad-hoc data views to the list of ad-hoc data view
     */
    appendAdHocDataViews: (dataViews: DataView | DataView[]) => void;
    /**
     * Remove the ad-hoc data view of the given id from the list of ad-hoc data view
     * @param id
     */
    removeAdHocDataViewById: (id: string) => void;
    /**
     * Replace the data view of the given id with the given data view
     * Used when the spec of a data view changed to prevent duplicates
     * @param id
     * @param dataView
     */
    replaceAdHocDataViewWithId: (id: string, dataView: DataView) => void;
  };
}

export const APP_STATE_URL_KEY = '_a';
const GLOBAL_STATE_URL_KEY = '_g';

/**
 * Builds and returns appState and globalState containers and helper functions
 * Used to sync URL with UI state
 */
export function getDiscoverStateContainer({
  history,
  savedSearch,
  services,
}: DiscoverStateContainerParams): DiscoverStateContainer {
  const initialSavedSearch = savedSearch ?? getEmptySavedSearch(services.data);
  const storeInSessionStorage = services.uiSettings.get('state:storeInSessionStorage');
  const toasts = services.core.notifications.toasts;
  const stateStorage = createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history,
    ...(toasts && withNotifyOnErrors(toasts)),
  });

  /**
   * Search session logic
   */
  const searchSessionManager = new DiscoverSearchSessionManager({
    history,
    session: services.data.search.session,
  });
  /**
   * App State Container, synced with URL
   */
  const appStateContainer = getDiscoverAppStateContainer(stateStorage, savedSearch, services);

  const savedSearchContainer = getSavedSearchContainer({
    savedSearch: initialSavedSearch,
    appStateContainer,
    services,
  });

  const replaceUrlAppState = async (newPartial: AppState = {}) => {
    await appStateContainer.replaceUrlState(newPartial);
  };

  const internalStateContainer = getInternalStateContainer();

  const pauseAutoRefreshInterval = async () => {
    const state = stateStorage.get<QueryState>(GLOBAL_STATE_URL_KEY);
    if (state?.refreshInterval && !state.refreshInterval.pause) {
      await stateStorage.set(
        GLOBAL_STATE_URL_KEY,
        { ...state, refreshInterval: { ...state?.refreshInterval, pause: true } },
        { replace: true }
      );
    }
  };

  const dataStateContainer = getDataStateContainer({
    services,
    searchSessionManager,
    getAppState: appStateContainer.getState,
    getSavedSearch: () => {
      // Simulating the behavior of the removed hook to always create a clean searchSource child that
      // we then use to add query, filters, etc., will be removed soon.
      return { ...savedSearch, searchSource: savedSearch.searchSource.createChild() };
    },
    appStateContainer,
  });
  const setDataView = (dataView: DataView) => {
    internalStateContainer.transitions.setDataView(dataView);
  };
  const setAdHocDataViews = (dataViews: DataView[]) =>
    internalStateContainer.transitions.setAdHocDataViews(dataViews);
  const appendAdHocDataViews = (dataViews: DataView | DataView[]) =>
    internalStateContainer.transitions.appendAdHocDataViews(dataViews);
  const replaceAdHocDataViewWithId = (id: string, dataView: DataView) =>
    internalStateContainer.transitions.replaceAdHocDataViewWithId(id, dataView);
  const removeAdHocDataViewById = (id: string) =>
    internalStateContainer.transitions.removeAdHocDataViewById(id);

  const loadDataViewList = async () => {
    const dataViewList = await services.dataViews.getIdsWithTitle(true);
    internalStateContainer.transitions.setSavedDataViews(dataViewList);
  };

  const loadAndResolveDataView = async (id: string, actualSavedSearch: SavedSearch) => {
    const nextDataViewData = await loadDataView(services.dataViews, services.uiSettings, id);
    const nextDataView = resolveDataView(
      nextDataViewData,
      actualSavedSearch.searchSource,
      services.toastNotifications
    );
    return { fallback: !nextDataViewData.stateValFound, dataView: nextDataView };
  };

  return {
    kbnUrlStateStorage: stateStorage,
    appState: appStateContainer,
    internalState: internalStateContainer,
    dataState: dataStateContainer,
    savedSearchState: savedSearchContainer,
    searchSessionManager,
    startSync: () => {
      const { start, stop } = appStateContainer.syncState();
      start();
      return stop;
    },
    setAppState: (newPartial: AppState) => setState(appStateContainer, newPartial),
    replaceUrlAppState,
    resetInitialAppState: () => appStateContainer.resetInitialState(),
    resetAppState: (nextSavedSearch: SavedSearch) =>
      appStateContainer.resetBySavedSearch(nextSavedSearch),
    getPreviousAppState: () => appStateContainer.getPrevious(),
    flushToUrl: () => stateStorage.kbnUrlControls.flush(),
    isAppStateDirty: () => appStateContainer.hasChanged(),
    pauseAutoRefreshInterval,
    initializeAndSync: () => appStateContainer.initAndSync(savedSearch),
    actions: {
      setDataView,
      loadAndResolveDataView,
      loadDataViewList,
      setAdHocDataViews,
      appendAdHocDataViews,
      replaceAdHocDataViewWithId,
      removeAdHocDataViewById,
    },
  };
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
export function isEqualFilters(filtersA?: Filter[] | Filter, filtersB?: Filter[] | Filter) {
  if (!filtersA && !filtersB) {
    return true;
  } else if (!filtersA || !filtersB) {
    return false;
  }
  return compareFilters(filtersA, filtersB, COMPARE_ALL_OPTIONS);
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

export function createSearchSessionRestorationDataProvider(deps: {
  appStateContainer: StateContainer<AppState>;
  data: DataPublicPluginStart;
  getSavedSearch: () => SavedSearch;
}): SearchSessionInfoProvider {
  const getSavedSearchId = () => deps.getSavedSearch().id;
  return {
    getName: async () => {
      const savedSearch = deps.getSavedSearch();
      return (
        (savedSearch.id && savedSearch.title) ||
        i18n.translate('discover.discoverDefaultSearchSessionName', {
          defaultMessage: 'Discover',
        })
      );
    },
    getLocatorData: async () => {
      return {
        id: DISCOVER_APP_LOCATOR,
        initialState: createUrlGeneratorState({
          ...deps,
          getSavedSearchId,
          shouldRestoreSearchSession: false,
        }),
        restoreState: createUrlGeneratorState({
          ...deps,
          getSavedSearchId,
          shouldRestoreSearchSession: true,
        }),
      };
    },
  };
}

function createUrlGeneratorState({
  appStateContainer,
  data,
  getSavedSearchId,
  shouldRestoreSearchSession,
}: {
  appStateContainer: StateContainer<AppState>;
  data: DataPublicPluginStart;
  getSavedSearchId: () => string | undefined;
  shouldRestoreSearchSession: boolean;
}): DiscoverAppLocatorParams {
  const appState = appStateContainer.get();
  return {
    filters: data.query.filterManager.getFilters(),
    dataViewId: appState.index,
    query: appState.query,
    savedSearchId: getSavedSearchId(),
    timeRange: shouldRestoreSearchSession
      ? data.query.timefilter.timefilter.getAbsoluteTime()
      : data.query.timefilter.timefilter.getTime(),
    searchSessionId: shouldRestoreSearchSession ? data.search.session.getSessionId() : undefined,
    columns: appState.columns,
    sort: appState.sort,
    savedQuery: appState.savedQuery,
    interval: appState.interval,
    refreshInterval: shouldRestoreSearchSession
      ? {
          pause: true, // force pause refresh interval when restoring a session
          value: 0,
        }
      : undefined,
    useHash: false,
    viewMode: appState.viewMode,
    hideAggregatedPreview: appState.hideAggregatedPreview,
    breakdownField: appState.breakdownField,
  };
}
