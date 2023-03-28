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
import { DataView, DataViewSpec, DataViewType } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { merge } from 'rxjs';
import { AggregateQuery, Query, TimeRange } from '@kbn/es-query';
import { FetchStatus } from '../../types';
import { changeDataView } from '../hooks/utils/change_data_view';
import { loadSavedSearch as loadNextSavedSearch } from './load_saved_search';
import { buildStateSubscribe } from '../hooks/utils/build_state_subscribe';
import { addLog } from '../../../utils/add_log';
import { getUrlTracker } from '../../../kibana_services';
import { loadDataView, resolveDataView } from '../utils/resolve_data_view';
import { DiscoverDataStateContainer, getDataStateContainer } from './discover_data_state_container';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '../../../../common';
import {
  DiscoverAppState,
  DiscoverAppStateContainer,
  getDiscoverAppStateContainer,
  GLOBAL_STATE_URL_KEY,
} from './discover_app_state_container';
import {
  DiscoverInternalStateContainer,
  getInternalStateContainer,
} from './discover_internal_state_container';
import { DiscoverServices } from '../../../build_services';
import {
  getDefaultAppState,
  getSavedSearchContainer,
  DiscoverSavedSearchContainer,
} from './discover_saved_search_container';
import { updateFiltersReferences } from '../utils/update_filter_references';

interface DiscoverStateContainerParams {
  /**
   * Browser history
   */
  history: History;
  /**
   * The current savedSearch
   */
  savedSearch?: string | SavedSearch;
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
   * Data fetching related state
   **/
  dataState: DiscoverDataStateContainer;
  /**
   * Internal state that's used at several places in the UI
   */
  internalState: DiscoverInternalStateContainer;
  /**
   * kbnUrlStateStorage - it keeps the state in sync with the URL
   */
  kbnUrlStateStorage: IKbnUrlStateStorage;
  /**
   * State of saved search, the saved object of Discover
   */
  savedSearchState: DiscoverSavedSearchContainer;
  /**
   * Service for handling search sessions
   */
  searchSessionManager: DiscoverSearchSessionManager;
  /**
   * Complex functions to update multiple containers from UI
   */
  actions: {
    /**
     * Triggers fetching of new data from Elasticsearch
     * If initial is true, then depending on the given configuration no fetch is triggered
     * @param initial
     */
    fetchData: (initial?: boolean) => void;
    /**
     * Initialize state with filters and query,  start state syncing
     */
    initializeAndSync: () => () => void;
    /**
     * Load current list of data views, add them to internal state
     */
    loadDataViewList: () => Promise<void>;
    /**
     * Load a saved search by id or create a new one that's not persisted yet
     * @param savedSearchId
     * @param dataView
     */
    loadSavedSearch: (
      savedSearchId?: string | undefined,
      dataView?: DataView | undefined,
      dataViewSpec?: DataViewSpec
    ) => Promise<SavedSearch | undefined>;
    /**
     * Create and select a ad-hoc data view by a given index pattern
     * @param pattern
     */
    onCreateDefaultAdHocDataView: (pattern: string) => Promise<void>;
    /**
     * Triggered when a new data view is created
     * @param dataView
     */
    onDataViewCreated: (dataView: DataView) => Promise<void>;
    /**
     * Triggered when a new data view is edited
     * @param dataView
     */
    onDataViewEdited: (dataView: DataView) => Promise<void>;
    /**
     * Triggered when a saved search is opened in the savedObject finder
     * @param savedSearchId
     */
    onOpenSavedSearch: (savedSearchId: string) => void;
    /**
     * Triggered when the unified search bar query is updated
     * @param payload
     * @param isUpdate
     */
    onUpdateQuery: (
      payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
      isUpdate?: boolean
    ) => void;
    /**
     * Triggered when the user selects a different data view in the data view picker
     * @param id
     */
    onChangeDataView: (id: string) => Promise<void>;
    /**
     * Triggered when an ad-hoc data view is persisted to allow sharing links and CSV
     * @param dataView
     */
    persistAdHocDataView: (dataView: DataView) => Promise<DataView>;
    /**
     * Set the currently selected data view
     */
    setDataView: (dataView: DataView) => void;
    /**
     * Undo changes made to the saved search
     */
    undoChanges: () => void;
    /**
     * When saving a saved search with an ad hoc data view, a new id needs to be generated for the data view
     * This is to prevent duplicate ids messing with our system
     */
    updateAdHocDataViewId: () => void;
  };
}

/**
 * Builds and returns appState and globalState containers and helper functions
 * Used to sync URL with UI state
 */
export function getDiscoverStateContainer({
  history,
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
  const savedSearchContainer = getSavedSearchContainer({
    services,
  });

  /**
   * App State Container, synced with URL
   */
  const appStateContainer = getDiscoverAppStateContainer({
    stateStorage,
    savedSearch: savedSearchContainer.getState(),
    services,
  });

  const internalStateContainer = getInternalStateContainer();

  const dataStateContainer = getDataStateContainer({
    services,
    searchSessionManager,
    getAppState: appStateContainer.getState,
    getSavedSearch: savedSearchContainer.getState,
  });

  const pauseAutoRefreshInterval = async (dataView: DataView) => {
    if (dataView && (!dataView.isTimeBased() || dataView.type === DataViewType.ROLLUP)) {
      const state = stateStorage.get<QueryState>(GLOBAL_STATE_URL_KEY);
      if (state?.refreshInterval && !state.refreshInterval.pause) {
        await stateStorage.set(
          GLOBAL_STATE_URL_KEY,
          { ...state, refreshInterval: { ...state?.refreshInterval, pause: true } },
          { replace: true }
        );
      }
    }
  };

  const setDataView = (dataView: DataView) => {
    internalStateContainer.transitions.setDataView(dataView);
    pauseAutoRefreshInterval(dataView);
    savedSearchContainer.getState().searchSource.setField('index', dataView);
  };

  const loadDataViewList = async () => {
    const dataViewList = await services.dataViews.getIdsWithTitle(true);
    internalStateContainer.transitions.setSavedDataViews(dataViewList);
  };
  /**
   * Load the data view of the given id
   * A fallback data view is returned, given there's no match
   * This is usually the default data view
   */
  const loadAndResolveDataView = async (id?: string, dataViewSpec?: DataViewSpec) => {
    const { adHocDataViews, savedDataViews } = internalStateContainer.getState();
    const adHodDataView = adHocDataViews.find((dataView) => dataView.id === id);
    if (adHodDataView) return { fallback: false, dataView: adHodDataView };

    const nextDataViewData = await loadDataView({
      services,
      id,
      dataViewSpec,
      dataViewList: savedDataViews,
    });
    const nextDataView = resolveDataView(nextDataViewData, services.toastNotifications);
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
    const trackingEnabled = Boolean(newDataView.isPersisted() || savedSearchContainer.getId());
    getUrlTracker().setTrackingEnabled(trackingEnabled);

    return newDataView;
  };

  const onOpenSavedSearch = async (newSavedSearchId: string) => {
    addLog('[discoverState] onOpenSavedSearch', newSavedSearchId);
    const currentSavedSearch = savedSearchContainer.getState();
    if (currentSavedSearch.id && currentSavedSearch.id === newSavedSearchId) {
      addLog('[discoverState] undo changes since saved search did not change');
      await undoChanges();
    } else {
      addLog('[discoverState] onOpenSavedSearch open view URL');
      history.push(`/view/${encodeURIComponent(newSavedSearchId)}`);
    }
  };

  const onDataViewCreated = async (nextDataView: DataView) => {
    if (!nextDataView.isPersisted()) {
      internalStateContainer.transitions.appendAdHocDataViews(nextDataView);
    } else {
      await loadDataViewList();
    }
    if (nextDataView.id) {
      await onChangeDataView(nextDataView);
    }
  };

  const onDataViewEdited = async (editedDataView: DataView) => {
    if (editedDataView.isPersisted()) {
      // Clear the current data view from the cache and create a new instance
      // of it, ensuring we have a new object reference to trigger a re-render
      services.dataViews.clearInstanceCache(editedDataView.id);
      setDataView(await services.dataViews.create(editedDataView.toSpec(), true));
    } else {
      await updateAdHocDataViewId();
    }
    loadDataViewList();
    fetchData();
  };

  const persistAdHocDataView = async (adHocDataView: DataView) => {
    const persistedDataView = await services.dataViews.createAndSave({
      ...adHocDataView.toSpec(),
      id: uuidv4(),
    });
    services.dataViews.clearInstanceCache(adHocDataView.id);
    updateFiltersReferences(adHocDataView, persistedDataView);
    internalStateContainer.transitions.removeAdHocDataViewById(adHocDataView.id!);
    await appStateContainer.update({ index: persistedDataView.id }, true);
    return persistedDataView;
  };

  const loadSavedSearch = async (
    id?: string,
    nextDataView?: DataView,
    dataViewSpec?: DataViewSpec
  ): Promise<SavedSearch> => {
    const { dataView } = nextDataView
      ? { dataView: nextDataView }
      : id
      ? { dataView: undefined }
      : await loadAndResolveDataView(appStateContainer.getState().index, dataViewSpec);

    const nextSavedSearch = await loadNextSavedSearch(id, dataView, {
      appStateContainer,
      savedSearchContainer,
    });

    if (
      id &&
      appStateContainer.getState().index &&
      appStateContainer.getState().index !== nextSavedSearch.searchSource.getField('index')
    ) {
      const { dataView: appStateDataView } = await loadAndResolveDataView(
        appStateContainer.getState().index,
        dataViewSpec
      );
      if (appStateDataView) {
        nextSavedSearch.searchSource.setField('index', appStateDataView);
      }
    }

    const actualDataView = nextSavedSearch.searchSource.getField('index');
    if (actualDataView) {
      setDataView(actualDataView);
      if (!actualDataView.isPersisted()) {
        internalStateContainer.transitions.appendAdHocDataViews(actualDataView);
      }
    }
    dataStateContainer.reset(nextSavedSearch);
    return nextSavedSearch;
  };

  const initializeAndSync = () => {
    const unsubscribeData = dataStateContainer.subscribe();
    const appStateInitAndSyncUnsubscribe = appStateContainer.initAndSync(
      savedSearchContainer.getState()
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
        filterAndQuery: true,
      });
      fetchData();
    });

    return () => {
      unsubscribeData();
      appStateUnsubscribe();
      appStateInitAndSyncUnsubscribe();
      filterUnsubscribe.unsubscribe();
    };
  };

  const onCreateDefaultAdHocDataView = async (pattern: string) => {
    const newDataView = await services.dataViews.create({
      title: pattern,
    });
    if (newDataView.fields.getByName('@timestamp')?.type === 'date') {
      newDataView.timeFieldName = '@timestamp';
    }
    internalStateContainer.transitions.appendAdHocDataViews(newDataView);

    await onChangeDataView(newDataView);
  };

  const onUpdateQuery = (
    payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
    isUpdate?: boolean
  ) => {
    if (isUpdate === false) {
      searchSessionManager.removeSearchSessionIdFromURL({ replace: false });
      dataStateContainer.fetch();
    }
  };

  /**
   * Function triggered when user changes data view in the sidebar
   */
  const onChangeDataView = async (id: string | DataView) => {
    await changeDataView(id, {
      services,
      internalState: internalStateContainer,
      appState: appStateContainer,
    });
  };

  const undoChanges = async () => {
    const nextSavedSearch = savedSearchContainer.getInitial$().getValue();
    await savedSearchContainer.set(nextSavedSearch);
    const newAppState = getDefaultAppState(nextSavedSearch, services);
    await appStateContainer.replaceUrlState(newAppState);
    return nextSavedSearch;
  };
  const fetchData = (initial: boolean = false) => {
    addLog('fetchData', { initial });
    if (!initial || dataStateContainer.getInitialFetchStatus() === FetchStatus.LOADING) {
      dataStateContainer.fetch();
    }
  };

  return {
    kbnUrlStateStorage: stateStorage,
    appState: appStateContainer,
    internalState: internalStateContainer,
    dataState: dataStateContainer,
    savedSearchState: savedSearchContainer,
    searchSessionManager,
    actions: {
      initializeAndSync,
      fetchData,
      loadDataViewList,
      loadSavedSearch,
      onChangeDataView,
      onCreateDefaultAdHocDataView,
      onDataViewCreated,
      onDataViewEdited,
      onOpenSavedSearch,
      onUpdateQuery,
      persistAdHocDataView,
      setDataView,
      undoChanges,
      updateAdHocDataViewId,
    },
  };
}

export function createSearchSessionRestorationDataProvider(deps: {
  appStateContainer: StateContainer<DiscoverAppState>;
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
  appStateContainer: StateContainer<DiscoverAppState>;
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
