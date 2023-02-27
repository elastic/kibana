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
  QueryState,
  SearchSessionInfoProvider,
} from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { getEmptySavedSearch, SavedSearch } from '@kbn/saved-search-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { merge } from 'rxjs';
import { buildStateSubscribe } from '../hooks/utils/build_state_subscribe';
import { loadDataViewBySavedSearch } from '../utils/load_data_view_by_saved_search';
import { addLog } from '../../../utils/add_log';
import { getUrlTracker } from '../../../kibana_services';
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
import { getSavedSearchContainer, SavedSearchContainer } from './discover_saved_search_container';
import { updateFiltersReferences } from '../utils/update_filter_references';
interface DiscoverStateContainerParams {
  /**
   * Browser history
   */
  history: History;
  /**
   * The current savedSearch
   */
  savedSearch?: SavedSearch;
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
   * Initialize state with filters and query, start state syncing
   */
  initializeAndSync: () => () => void;
  /**
   * Set app state to with a partial new app state
   */
  setAppState: (newState: Partial<AppState>) => void;
  /**
   * Pause the auto refresh interval without pushing an entry to history
   */
  pauseAutoRefreshInterval: () => Promise<void>;
  /**
   * functions executed by UI
   */
  actions: {
    onOpenSavedSearch: (savedSearchId: string) => void;
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
     * When saving a saved search with an ad hoc data view, a new id needs to be generated for the data view
     * This is to prevent duplicate ids messing with our system
     */
    updateAdHocDataViewId: () => void;
    /**
     * Load a saved search by id
     * @param savedSearchId
     * @param dataViewSpec
     */
    loadSavedSearch: (savedSearchId: string) => Promise<SavedSearch | undefined>;
    /**
     * Load new saved search
     */
    loadNewSavedSearch: (dataView: DataView | undefined) => Promise<SavedSearch | undefined>;
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
  const appStateContainer = getDiscoverAppStateContainer({
    stateStorage,
    savedSearch: initialSavedSearch,
    services,
  });

  const savedSearchContainer = getSavedSearchContainer({
    savedSearch: initialSavedSearch,
    appStateContainer,
    services,
  });

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
      const actualSavedSearch = savedSearchContainer.get();
      return { ...actualSavedSearch, searchSource: actualSavedSearch.searchSource.createChild() };
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
  const removeAdHocDataViewById = (id: string) =>
    internalStateContainer.transitions.removeAdHocDataViewById(id);

  const loadDataViewList = async () => {
    const dataViewList = await services.dataViews.getIdsWithTitle(true);
    internalStateContainer.transitions.setSavedDataViews(dataViewList);
  };

  const loadAndResolveDataView = async (id?: string, actualSavedSearch?: SavedSearch) => {
    const nextDataViewData = await loadDataView(services.dataViews, services.uiSettings, id);
    const nextDataView = resolveDataView(
      nextDataViewData,
      actualSavedSearch?.searchSource,
      services.toastNotifications
    );
    return { fallback: !nextDataViewData.stateValFound, dataView: nextDataView };
  };

  /**
   * When saving a saved search with an ad hoc data view, a new id needs to be generated for the data view
   * This is to prevent duplicate ids messing with our system
   */
  const updateAdHocDataViewId = async () => {
    const prevDataView = internalStateContainer.getState().dataView;
    if (!prevDataView || prevDataView.isPersisted()) return;
    const newDataView = await services.dataViews.create({ ...prevDataView.toSpec(), id: uuidv4() });
    services.dataViews.clearInstanceCache(prevDataView.id);

    updateFiltersReferences(prevDataView, newDataView);

    internalStateContainer.transitions.replaceAdHocDataViewWithId(prevDataView.id!, newDataView);
    await appStateContainer.replaceUrlState({ index: newDataView.id });
    const trackingEnabled = Boolean(newDataView.isPersisted() || initialSavedSearch.id);
    getUrlTracker().setTrackingEnabled(trackingEnabled);

    return newDataView;
  };

  const onOpenSavedSearch = async (newSavedSearchId: string) => {
    addLog('🧭 [discoverState] onOpenSavedSearch', newSavedSearchId);
    const currentSavedSearch = savedSearchContainer.get();
    if (currentSavedSearch.id && currentSavedSearch.id === newSavedSearchId) {
      addLog("🧭 [discoverState] onOpenSavedSearch just reset since id didn't change");
      const nextSavedSearch = await savedSearchContainer.reset(currentSavedSearch.id);
      if (nextSavedSearch) {
        await appStateContainer.resetWithSavedSearch(nextSavedSearch);
      }
    } else {
      addLog('🧭 [discoverState] onOpenSavedSearch open view URL');
      history.push(`/view/${encodeURIComponent(newSavedSearchId)}`);
    }
  };

  const loadSavedSearch = async (id: string): Promise<SavedSearch> => {
    addLog('🧭 [discoverState] loadSavedSearch');
    const isEmptyURL = appStateContainer.isEmptyURL();
    if (isEmptyURL) {
      appStateContainer.set({});
    }
    const currentSavedSearch = await savedSearchContainer.load(id, {
      dataViewList: internalStateContainer.getState().savedDataViews,
      appState: !isEmptyURL ? appStateContainer.getState() : undefined,
    });
    if (currentSavedSearch) {
      await appStateContainer.resetWithSavedSearch(currentSavedSearch);
      setDataView(currentSavedSearch.searchSource.getField('index')!);
    }
    return currentSavedSearch;
  };

  const loadNewSavedSearch = async (nextDataView: DataView | undefined) => {
    addLog('🧭 [discoverState] loadNewSavedSearch', { nextDataView });
    const isEmptyURL = appStateContainer.isEmptyURL();
    let { dataView } = nextDataView ? { dataView: nextDataView } : await loadAndResolveDataView();
    const nextSavedSearch = await savedSearchContainer.new(
      dataView,
      !isEmptyURL ? appStateContainer.getState() : undefined
    );

    if (!dataView) {
      dataView = await loadDataViewBySavedSearch(
        nextSavedSearch,
        appStateContainer,
        internalStateContainer.getState().savedDataViews,
        services
      );
    }

    if (dataView) {
      nextSavedSearch.searchSource.setField('index', dataView);
      setDataView(dataView);
    }

    appStateContainer.resetWithSavedSearch(nextSavedSearch);
    await savedSearchContainer.update({
      nextDataView: dataView,
      nextState: appStateContainer.getState(),
      resetSavedSearch: true,
    });
    return nextSavedSearch;
  };

  return {
    kbnUrlStateStorage: stateStorage,
    appState: appStateContainer,
    internalState: internalStateContainer,
    dataState: dataStateContainer,
    savedSearchState: savedSearchContainer,
    searchSessionManager,
    setAppState: (newPartial: AppState) => appStateContainer.update(newPartial),
    pauseAutoRefreshInterval,
    initializeAndSync: () => {
      const unsubscribeData = dataStateContainer.subscribe();
      const appStateInitAndSyncUnsubscribe = appStateContainer.initAndSync(
        savedSearchContainer.get()
      );

      const appStateUnsubscribe = appStateContainer.subscribe(
        buildStateSubscribe({
          appState: appStateContainer,
          savedSearchState: savedSearchContainer,
          dataState: dataStateContainer,
          loadAndResolveDataView,
          setDataView,
        })
      );

      const filterUnsubscribe = merge(
        services.data.query.queryString.getUpdates$(),
        services.filterManager.getFetches$()
      ).subscribe(async () => {
        await savedSearchContainer.update({
          nextDataView: internalStateContainer.getState().dataView,
          nextState: appStateContainer.getState(),
          resetSavedSearch: false,
          filterAndQuery: true,
        });
        dataStateContainer.fetch();
      });

      return () => {
        unsubscribeData();
        appStateUnsubscribe();
        appStateInitAndSyncUnsubscribe();
        filterUnsubscribe.unsubscribe();
      };
    },
    actions: {
      onOpenSavedSearch,
      setDataView,
      loadAndResolveDataView,
      loadDataViewList,
      loadSavedSearch,
      loadNewSavedSearch,
      setAdHocDataViews,
      appendAdHocDataViews,
      removeAdHocDataViewById,
      updateAdHocDataViewId,
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
