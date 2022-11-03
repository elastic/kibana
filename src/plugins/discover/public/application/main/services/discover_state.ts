/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { merge } from 'rxjs';
import { History } from 'history';
import { AggregateQuery, Query } from '@kbn/es-query';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { QueryState } from '@kbn/data-plugin/public';
import { getEmptySavedSearch, SavedSearch } from '@kbn/saved-search-plugin/public';
import { DataView, DataViewSpec, TimeRange } from '@kbn/data-plugin/common';
import { createStateHelpers, setState } from './discover_state_utils';
import { buildStateSubscribe } from '../hooks/utils/build_state_subscribe';
import { loadDataViewBySavedSearch } from '../load_data_view_by_saved_search';
import { addLog } from '../../../utils/add_log';
import {
  getInternalStateContainer,
  InternalStateContainer,
} from './discover_internal_state_container';
import {
  AppState,
  DiscoverAppStateContainer,
  getDiscoverAppStateContainer,
} from './discover_app_state_container';
import { DataStateContainer, getDataStateContainer } from './discover_data_state_container';
import { getSavedSearchContainer, SavedSearchContainer } from './discover_saved_search_container';
import { DiscoverServices } from '../../../build_services';
import { DiscoverSearchSessionManager } from './discover_search_session';

interface GetStateParams {
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
   * Helps with state management of search session and {@link SEARCH_SESSION_ID_QUERY_PARAM} in the URL
   **/
  searchSessionManager: DiscoverSearchSessionManager;
  /**
   * Data fetching related state
   **/
  dataState: DataStateContainer;
  /**
   * Set app state to with a partial new app state
   */
  setAppState: (newState: Partial<AppState>, replace?: boolean) => void;
  /**
   * Sync state to URL, used for testing
   */
  flushToUrl: () => void;
  /**
   * State transitioning functions executed by UI
   */
  actions: {
    /**
     * Trigger data fetching
     * @param reset - when true the loading indicate is displayed, else the given result in the table is just updated
     */
    fetch: (reset?: boolean) => void;
    /**
     * Load the current list of data views, save in internal states
     */
    loadDataViewList: () => Promise<void>;
    /**
     * Load a persisted saved search by id
     * @param dataViewSpec - use an ad-hoc data view
     */
    loadSavedSearch: (
      id: string | undefined,
      dataViewSpec?: DataViewSpec
    ) => Promise<SavedSearch | undefined>;
    /**
     * Load a new saved search
     * @param dataViewSpec use an ad-hoc data view
     */
    loadNewSavedSearch: (dataViewSpec?: DataViewSpec) => Promise<SavedSearch | undefined>;
    /**
     * Switch from the current selected data view to a new one
     * @param id the id of the data view to switch to
     * @param replace if true use history.replace of the data view id in the URL (index param)
     */
    onChangeDataView: (id: string, replace?: boolean) => void;
    /**
     * Triggered when a data view field was edited
     * @param nextDataView
     */
    onFieldEdited: (nextDataView?: DataView) => void;
    /**
     * Function triggered when a new saved search is requested by URL of `New` link of the top navigation
     */
    onNewSavedSearch: () => void;
    /**
     * Triggered when users open an existing saved search
     * @param newSavedSearchId
     */
    onOpenSavedSearch: (newSavedSearchId: string) => void;
    /**
     * Triggered when the saved query id of unified search bar changes
     * @param newSavedQueryId - the new id
     */
    onSavedQueryIdChange: (newSavedQueryId: string | undefined) => void;
    /**
     * Triggered when the unified search bar submits a new/existing query
     * @param payload
     * @param isUpdate
     */
    onSubmitQuery: (
      payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
      isUpdate?: boolean
    ) => void;
    /**
     * Pause the auto refresh interval without pushing an entry to history
     */
    pauseAutoRefreshInterval: () => Promise<void>;
    /**
     * Function the sent the currently active data view instance
     * @param dataView
     */
    setDataView: (dataView: DataView) => void;
    /**
     * Start subscribing to all state containers
     */
    subscribe: () => () => void;
    /**
     * Stop subscribing to all state containers
     */
    unsubscribe: () => void;
  };
}

const GLOBAL_STATE_URL_KEY = '_g';

/**
 * The central state container of Discover main, keeping appState, globalState, internalState, dataState, savedSearchState
 */
export function getDiscoverStateContainer({
  history,
  savedSearch,
  services,
}: GetStateParams): DiscoverStateContainer {
  const initialSavedSearch = savedSearch ?? getEmptySavedSearch(services.data);
  const storeInSessionStorage = services.uiSettings.get('state:storeInSessionStorage');
  const stateStorage = createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history,
    ...withNotifyOnErrors(services.core.notifications.toasts),
  });

  /**
   * Search session logic
   */
  const searchSessionManager = new DiscoverSearchSessionManager({
    history,
    session: services.data.search.session,
  });

  const appStateContainer = getDiscoverAppStateContainer(
    stateStorage,
    initialSavedSearch,
    services
  );

  const savedSearchContainer = getSavedSearchContainer({
    savedSearch: initialSavedSearch,
    appStateContainer,
    services,
  });

  const internalStateContainer = getInternalStateContainer();

  const setAppState = appStateContainer.update;

  const pauseAutoRefreshInterval = async () => {
    addLog('🧭 [discoverState] pauseAutoRefreshInterval');
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
    getSavedSearch: savedSearchContainer.get,
  });

  let unsubscribeSync: (() => void) | undefined;
  const fetchData = (reset?: boolean) => {
    addLog('🧭 [discoverState] fetch data', { reset });
    const msg = reset ? 'reset' : undefined;
    dataStateContainer.refetch$.next(msg);
  };

  const setDataView = (dataView: DataView) => {
    internalStateContainer.transitions.setDataView(dataView);
    if (!dataView.isPersisted()) {
      const adHocDataViewList = internalStateContainer.getState().dataViewsAdHoc;
      const existing = adHocDataViewList.find((prevDataView) => prevDataView.id === dataView.id);
      if (!existing) {
        internalStateContainer.transitions.setDataViewsAdHoc([...adHocDataViewList, dataView]);
      }
    }
    savedSearchContainer.get().searchSource.setField('index', dataView);
  };

  const loadSavedSearch = async (
    id: string | undefined,
    dataViewSpec: DataViewSpec | undefined
  ) => {
    addLog('🧭 [discoverState] loadSavedSearch', { id });
    const isEmptyURL = appStateContainer.isEmptyURL();
    if (isEmptyURL) {
      appStateContainer.set({});
    }
    const currentSavedSearch = await savedSearchContainer.load(id, {
      dataViewSpec,
      dataViewList: internalStateContainer.getState().dataViews,
      appState: appStateContainer.getState(),
      updateWithAppState: !isEmptyURL,
    });
    if (currentSavedSearch) {
      await appStateContainer.resetBySavedSearch(currentSavedSearch);
      setDataView(currentSavedSearch.searchSource.getField('index')!);
    }
    return currentSavedSearch;
  };

  const loadNewSavedSearch = async (dataViewSpec: DataViewSpec | undefined) => {
    addLog('🧭 [discoverState] loadNewSavedSearch');
    const isEmptyURL = appStateContainer.isEmptyURL();
    if (isEmptyURL) {
      appStateContainer.set({});
    }
    const nextSavedSearch = await savedSearchContainer.new();
    const appState = appStateContainer.getState();
    /**
    if (!isEmptyURL) {
      await savedSearchContainer.update(undefined, appState);
    } **/
    const nextDataView = await loadDataViewBySavedSearch(
      nextSavedSearch,
      appState.index,
      internalStateContainer.getState().dataViews,
      services,
      dataViewSpec
    );
    if (nextDataView) {
      setDataView(nextDataView);
    }
    await savedSearchContainer.update(nextDataView, appState);
    const nextAppState = appStateContainer.resetBySavedSearch(savedSearchContainer.get());
    await savedSearchContainer.update(undefined, nextAppState);
    return nextSavedSearch;
  };

  const onOpenSavedSearch = async (newSavedSearchId: string) => {
    addLog('🧭 [discoverState] onOpenSavedSearch', newSavedSearchId);
    const currentSavedSearch = savedSearchContainer.savedSearch$.getValue();
    if (currentSavedSearch.id && currentSavedSearch.id === newSavedSearchId) {
      addLog("🧭 [discoverState] onOpenSavedSearch just reset since id didn't change");
      const nextSavedSearch = await savedSearchContainer.reset(currentSavedSearch.id);
      if (nextSavedSearch) {
        await appStateContainer.resetBySavedSearch(nextSavedSearch);
      }
    } else {
      addLog('🧭 [discoverState] onOpenSavedSearch open view URL');
      history.push(`/view/${encodeURIComponent(newSavedSearchId)}`);
    }
  };

  const onSavedQueryIdChange = (newSavedQueryId: string | undefined) => {
    if (newSavedQueryId) {
      setState(appStateContainer, { savedQuery: newSavedQueryId });
    } else {
      // remove savedQueryId from state
      const newState = {
        ...appStateContainer.getState(),
      };
      delete newState.savedQuery;
      appStateContainer.set(newState);
    }
  };

  const onSubmitQuery: DiscoverStateContainer['actions']['onSubmitQuery'] = (
    _,
    isUpdate?: boolean
  ) => {
    if (isUpdate === false) {
      searchSessionManager.removeSearchSessionIdFromURL({ replace: false });
      fetchData(undefined);
    }
  };

  const onChangeDataView = async (id: string, replaceURL = false) => {
    setAppState({ index: id }, replaceURL);
  };

  const loadDataViewList = async () => {
    const dataViewList = await services.dataViews.getIdsWithTitle();
    internalStateContainer.transitions.setDataViews(dataViewList);
  };

  const onNewSavedSearch = async () => {
    addLog('🧭 [discoverState] onNewSavedSearch');
    const nextSavedSearch = await savedSearchContainer.new();
    appStateContainer.resetBySavedSearch(nextSavedSearch);
  };

  const subscribe = () => {
    addLog('🧭 [discoverState] subscribe to all containers');
    const unsubscribeData = dataStateContainer.subscribe();
    const stopSync = appStateContainer.initAndSync(savedSearchContainer.get());
    const unsubscribe = appStateContainer.subscribe(
      buildStateSubscribe({
        appStateContainer,
        savedSearchContainer,
        dataStateContainer,
        services,
        getDataViewList: () => internalStateContainer.getState().dataViews,
        setDataView,
      })
    );

    const filterUnsubscribe = merge(
      services.data.query.queryString.getUpdates$(),
      services.filterManager.getFetches$()
    ).subscribe(async () => {
      await savedSearchContainer.update(
        internalStateContainer.getState().dataView,
        appStateContainer.getState(),
        false,
        true
      );
      fetchData(undefined);
    });
    unsubscribeSync = () => {
      stopSync();
      unsubscribe();
      unsubscribeData();
      filterUnsubscribe.unsubscribe();
    };
    return unsubscribeSync;
  };

  const unsubscribe = () => {
    if (unsubscribeSync) {
      unsubscribeSync();
      unsubscribeSync = undefined;
    }
  };

  const onFieldEdited = async (nextDataView?: DataView) => {
    const dataView = internalStateContainer.getState().dataView;
    const usedDataView = nextDataView || dataView;
    if (usedDataView) {
      savedSearchContainer.get().searchSource.setField('index', usedDataView);
      setDataView(usedDataView);
    }
    fetchData(true);
  };

  return {
    appState: appStateContainer,
    internalState: internalStateContainer,
    dataState: dataStateContainer,
    savedSearchState: savedSearchContainer,
    searchSessionManager,
    setAppState,
    flushToUrl: () => stateStorage.kbnUrlControls.flush(),
    actions: {
      fetch: fetchData,
      loadDataViewList,
      loadNewSavedSearch,
      loadSavedSearch,
      onNewSavedSearch,
      onChangeDataView,
      onFieldEdited,
      onOpenSavedSearch,
      onSavedQueryIdChange,
      onSubmitQuery,
      pauseAutoRefreshInterval,
      setDataView,
      subscribe,
      unsubscribe,
    },
  };
}

export const {
  Provider: DiscoverStateProvider,
  useSavedSearch,
  useSavedSearchPersisted,
} = createStateHelpers();
