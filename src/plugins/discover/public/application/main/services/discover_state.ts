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
  noSearchSessionStorageCapabilityMessage,
  SearchSessionInfoProvider,
} from '@kbn/data-plugin/public';
import { DataView, DataViewSpec, DataViewType } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { merge } from 'rxjs';
import { AggregateQuery, Query, TimeRange } from '@kbn/es-query';
import { loadSavedSearch as loadSavedSearchFn } from './load_saved_search';
import { restoreStateFromSavedSearch } from '../../../services/saved_searches/restore_from_saved_search';
import { DiscoverDisplayMode, FetchStatus } from '../../types';
import { changeDataView } from '../hooks/utils/change_data_view';
import { buildStateSubscribe } from '../hooks/utils/build_state_subscribe';
import { addLog } from '../../../utils/add_log';
import { getUrlTracker } from '../../../kibana_services';
import { DiscoverDataStateContainer, getDataStateContainer } from './discover_data_state_container';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '../../../../common';
import {
  DiscoverAppState,
  DiscoverAppStateContainer,
  getDiscoverAppStateContainer,
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
import {
  getDiscoverGlobalStateContainer,
  DiscoverGlobalStateContainer,
} from './discover_global_state_container';
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
  /*
   * mode in which discover is running
   *
   * */
  mode?: DiscoverDisplayMode;
}

export interface LoadParams {
  /**
   * the id of the saved search to load, if undefined, a new saved search will be created
   */
  savedSearchId?: string;
  /**
   * the data view to use, if undefined, the saved search's data view will be used
   */
  dataView?: DataView;
  /**
   * the data view spec to use, if undefined, the saved search's data view will be used
   */
  dataViewSpec?: DataViewSpec;
}

export interface DiscoverStateContainer {
  /**
   * Global State, the _g part of the URL
   */
  globalState: DiscoverGlobalStateContainer;

  /**
   * App state, the _a part of the URL
   */
  appState: DiscoverAppStateContainer;
  /**
   * Data fetching related state
   **/
  dataState: DiscoverDataStateContainer;
  /**
   * Internal shared state that's used at several places in the UI
   */
  internalState: DiscoverInternalStateContainer;
  /**
   * State of saved search, the saved object of Discover
   */
  savedSearchState: DiscoverSavedSearchContainer;
  /**
   * State of url, allows updating and subscribing to url changes
   */
  stateStorage: IKbnUrlStateStorage;
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
     * If initial is true, when SEARCH_ON_PAGE_LOAD_SETTING is set to false and it's a new saved search no fetch is triggered
     * @param initial
     */
    fetchData: (initial?: boolean) => void;
    /**
     * Initializing state containers and start subscribing to changes triggering e.g. data fetching
     */
    initializeAndSync: () => () => void;
    /**
     * Load current list of data views, add them to internal state
     */
    loadDataViewList: () => Promise<void>;
    /**
     * Load a saved search by id or create a new one that's not persisted yet
     * @param LoadParams - optional parameters to load a saved search
     */
    loadSavedSearch: (param?: LoadParams) => Promise<SavedSearch | undefined>;
    /**
     * Create and select a temporary/adhoc data view by a given index pattern
     * Used by the Data View Picker
     * @param pattern
     */
    createAndAppendAdHocDataView: (dataViewSpec: DataViewSpec) => Promise<DataView>;
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
     * @param id - id of the data view
     */
    onChangeDataView: (id: string) => Promise<void>;
    /**
     * Set the currently selected data view
     * @param dataView
     */
    setDataView: (dataView: DataView) => void;
    /**
     * Undo changes made to the saved search, e.g. when the user triggers the "Reset search" button
     */
    undoSavedSearchChanges: () => void;
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
  mode = 'standalone',
}: DiscoverStateContainerParams): DiscoverStateContainer {
  const storeInSessionStorage = services.uiSettings.get('state:storeInSessionStorage');
  const toasts = services.core.notifications.toasts;

  /**
   * state storage for state in the URL
   */
  const stateStorage = createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history,
    useHashQuery: mode !== 'embedded',
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
   * Global State Container, synced with the _g part URL
   */
  const globalStateContainer = getDiscoverGlobalStateContainer(stateStorage);

  /**
   * Saved Search State Container, the persisted saved object of Discover
   */
  const savedSearchContainer = getSavedSearchContainer({
    services,
    globalStateContainer,
  });

  /**
   * App State Container, synced with the _a part URL
   */
  const appStateContainer = getDiscoverAppStateContainer({
    stateStorage,
    savedSearch: savedSearchContainer.getState(),
    services,
  });

  /**
   * Internal State Container, state that's not persisted and not part of the URL
   */
  const internalStateContainer = getInternalStateContainer();

  const pauseAutoRefreshInterval = async (dataView: DataView) => {
    if (dataView && (!dataView.isTimeBased() || dataView.type === DataViewType.ROLLUP)) {
      const state = globalStateContainer.get();
      if (state?.refreshInterval && !state.refreshInterval.pause) {
        await globalStateContainer.set({
          ...state,
          refreshInterval: { ...state?.refreshInterval, pause: true },
        });
      }
    }
  };
  const setDataView = (dataView: DataView) => {
    internalStateContainer.transitions.setDataView(dataView);
    pauseAutoRefreshInterval(dataView);
    savedSearchContainer.getState().searchSource.setField('index', dataView);
  };

  const dataStateContainer = getDataStateContainer({
    services,
    searchSessionManager,
    getAppState: appStateContainer.getState,
    getInternalState: internalStateContainer.getState,
    getSavedSearch: savedSearchContainer.getState,
    setDataView,
  });

  const loadDataViewList = async () => {
    const dataViewList = await services.dataViews.getIdsWithTitle(true);
    internalStateContainer.transitions.setSavedDataViews(dataViewList);
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
      await undoSavedSearchChanges();
    } else {
      addLog('[discoverState] onOpenSavedSearch open view URL');
      services.locator.navigate({
        savedSearchId: newSavedSearchId,
      });
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
    addLog('[getDiscoverStateContainer] onDataViewEdited triggers data fetching');
    fetchData();
  };

  const loadSavedSearch = async (params?: LoadParams): Promise<SavedSearch> => {
    return loadSavedSearchFn(params ?? {}, {
      appStateContainer,
      dataStateContainer,
      internalStateContainer,
      savedSearchContainer,
      services,
      setDataView,
    });
  };

  /**
   * state containers initializing and subscribing to changes triggering e.g. data fetching
   */
  const initializeAndSync = () => {
    // initialize app state container, syncing with _g and _a part of the URL
    const appStateInitAndSyncUnsubscribe = appStateContainer.initAndSync(
      savedSearchContainer.getState()
    );
    // subscribing to state changes of appStateContainer, triggering data fetching
    const appStateUnsubscribe = appStateContainer.subscribe(
      buildStateSubscribe({
        appState: appStateContainer,
        savedSearchState: savedSearchContainer,
        dataState: dataStateContainer,
        internalState: internalStateContainer,
        services,
        setDataView,
      })
    );
    // start subscribing to dataStateContainer, triggering data fetching
    const unsubscribeData = dataStateContainer.subscribe();

    // updates saved search when query or filters change, triggers data fetching
    const filterUnsubscribe = merge(services.filterManager.getFetches$()).subscribe(() => {
      savedSearchContainer.update({
        nextDataView: internalStateContainer.getState().dataView,
        nextState: appStateContainer.getState(),
        useFilterAndQueryServices: true,
      });
      addLog('[getDiscoverStateContainer] filter changes triggers data fetching');
      fetchData();
    });

    services.data.search.session.enableStorage(
      createSearchSessionRestorationDataProvider({
        appStateContainer,
        data: services.data,
        getSavedSearch: () => savedSearchContainer.getState(),
      }),
      {
        isDisabled: () =>
          services.capabilities.discover.storeSearchSession
            ? { disabled: false }
            : {
                disabled: true,
                reasonText: noSearchSessionStorageCapabilityMessage,
              },
      }
    );

    return () => {
      unsubscribeData();
      appStateUnsubscribe();
      appStateInitAndSyncUnsubscribe();
      filterUnsubscribe.unsubscribe();
    };
  };

  const createAndAppendAdHocDataView = async (dataViewSpec: DataViewSpec) => {
    const newDataView = await services.dataViews.create(dataViewSpec);
    if (newDataView.fields.getByName('@timestamp')?.type === 'date') {
      newDataView.timeFieldName = '@timestamp';
    }
    internalStateContainer.transitions.appendAdHocDataViews(newDataView);

    await onChangeDataView(newDataView);
    return newDataView;
  };
  /**
   * Triggered when a user submits a query in the search bar
   */
  const onUpdateQuery = (
    payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
    isUpdate?: boolean
  ) => {
    if (isUpdate === false) {
      // remove the search session if the given query is not just updated
      searchSessionManager.removeSearchSessionIdFromURL({ replace: false });
      addLog('[getDiscoverStateContainer] onUpdateQuery triggers data fetching');
      dataStateContainer.fetch();
    }
  };

  /**
   * Function e.g. triggered when user changes data view in the sidebar
   */
  const onChangeDataView = async (id: string | DataView) => {
    await changeDataView(id, {
      services,
      internalState: internalStateContainer,
      appState: appStateContainer,
    });
  };
  /**
   * Undo all changes to the current saved search
   */
  const undoSavedSearchChanges = async () => {
    addLog('undoSavedSearchChanges');
    const nextSavedSearch = savedSearchContainer.getInitial$().getValue();
    savedSearchContainer.set(nextSavedSearch);
    restoreStateFromSavedSearch({
      savedSearch: nextSavedSearch,
      timefilter: services.timefilter,
    });
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
    globalState: globalStateContainer,
    appState: appStateContainer,
    internalState: internalStateContainer,
    dataState: dataStateContainer,
    savedSearchState: savedSearchContainer,
    stateStorage,
    searchSessionManager,
    actions: {
      initializeAndSync,
      fetchData,
      loadDataViewList,
      loadSavedSearch,
      onChangeDataView,
      createAndAppendAdHocDataView,
      onDataViewCreated,
      onDataViewEdited,
      onOpenSavedSearch,
      onUpdateQuery,
      setDataView,
      undoSavedSearchChanges,
      updateAdHocDataViewId,
    },
  };
}

export function createSearchSessionRestorationDataProvider(deps: {
  appStateContainer: StateContainer<DiscoverAppState>;
  data: DataPublicPluginStart;
  getSavedSearch: () => SavedSearch;
}): SearchSessionInfoProvider {
  const getSavedSearch = () => deps.getSavedSearch();
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
          getSavedSearch,
          shouldRestoreSearchSession: false,
        }),
        restoreState: createUrlGeneratorState({
          ...deps,
          getSavedSearch,
          shouldRestoreSearchSession: true,
        }),
      };
    },
  };
}

function createUrlGeneratorState({
  appStateContainer,
  data,
  getSavedSearch,
  shouldRestoreSearchSession,
}: {
  appStateContainer: StateContainer<DiscoverAppState>;
  data: DataPublicPluginStart;
  getSavedSearch: () => SavedSearch;
  shouldRestoreSearchSession: boolean;
}): DiscoverAppLocatorParams {
  const appState = appStateContainer.get();
  const dataView = getSavedSearch().searchSource.getField('index');
  return {
    filters: data.query.filterManager.getFilters(),
    dataViewId: appState.index,
    query: appState.query,
    savedSearchId: getSavedSearch().id,
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
    dataViewSpec: !dataView?.isPersisted() ? dataView?.toMinimalSpec() : undefined,
  };
}
