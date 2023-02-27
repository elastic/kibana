/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { History } from 'history';
import {
  createKbnUrlStateStorage,
  IKbnUrlStateStorage,
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
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { loadDataView, resolveDataView } from '../utils/resolve_data_view';
import { DataStateContainer, getDataStateContainer } from './discover_data_state_container';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '../../../../common';
import {
  AppState,
  DiscoverAppStateContainer,
  getDiscoverAppStateContainer,
  GLOBAL_STATE_URL_KEY,
} from './discover_app_state_container';
import {
  getInternalStateContainer,
  InternalStateContainer,
} from './discover_internal_state_container';
import { DiscoverServices } from '../../../build_services';
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
   * Service for handling search sessions
   */
  searchSessionManager: DiscoverSearchSessionManager;
  /**
   * Data fetching related state
   **/
  dataState: DataStateContainer;
  /**
   * functions executed by UI
   */
  actions: {
    /**
     * Pause the auto refresh interval without pushing an entry to history
     */
    pauseAutoRefreshInterval: () => Promise<void>;
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
    /**
     * Initialize state with filters and query,  start state syncing
     */
    initializeAndSync: (
      dataView: DataView,
      filterManager: FilterManager,
      data: DataPublicPluginStart
    ) => () => void;
  };
}

/**
 * Builds and returns appState and globalState containers and helper functions
 * Used to sync URL with UI state
 */
export function getDiscoverStateContainer({
  history,
  savedSearch,
  services,
}: DiscoverStateContainerParams): DiscoverStateContainer {
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
  const appStateContainer = getDiscoverAppStateContainer({ stateStorage, savedSearch, services });

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
  const initializeAndSync = () => appStateContainer.initAndSync(savedSearch);

  return {
    kbnUrlStateStorage: stateStorage,
    appState: appStateContainer,
    internalState: internalStateContainer,
    dataState: dataStateContainer,
    searchSessionManager,
    actions: {
      pauseAutoRefreshInterval,
      setDataView,
      loadAndResolveDataView,
      loadDataViewList,
      setAdHocDataViews,
      appendAdHocDataViews,
      replaceAdHocDataViewWithId,
      removeAdHocDataViewById,
      initializeAndSync,
    },
  };
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
