/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart, SearchSessionInfoProvider } from '@kbn/data-plugin/public';
import { noSearchSessionStorageCapabilityMessage } from '@kbn/data-plugin/public';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import { DataViewType } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { merge } from 'rxjs';
import { getInitialESQLQuery } from '@kbn/esql-utils';
import type { AggregateQuery, Query, TimeRange } from '@kbn/es-query';
import { isOfAggregateQueryType, isOfQueryType } from '@kbn/es-query';
import { isFunction } from 'lodash';
import type { DiscoverServices } from '../../..';
import { FetchStatus } from '../../types';
import { changeDataView } from './utils/change_data_view';
import { buildStateSubscribe } from './utils/build_state_subscribe';
import { addLog } from '../../../utils/add_log';
import type { DiscoverDataStateContainer } from './discover_data_state_container';
import { getDataStateContainer } from './discover_data_state_container';
import type { DiscoverSearchSessionManager } from './discover_search_session';
import type { DiscoverAppLocatorParams } from '../../../../common';
import { DISCOVER_APP_LOCATOR } from '../../../../common';
import type { DiscoverAppState, DiscoverAppStateContainer } from './discover_app_state_container';
import { getDiscoverAppStateContainer } from './discover_app_state_container';
import { updateFiltersReferences } from './utils/update_filter_references';
import type { DiscoverCustomizationContext } from '../../../customizations';
import {
  createDataViewDataSource,
  DataSourceType,
  isDataSourceType,
} from '../../../../common/data_sources';
import type { InternalStateStore, RuntimeStateManager, TabActionInjector, TabState } from './redux';
import {
  createTabActionInjector,
  internalStateActions,
  selectTab,
  selectTabRuntimeState,
  selectIsDataViewUsedInMultipleRuntimeTabStates,
} from './redux';
import type { DiscoverSavedSearchContainer } from './discover_saved_search_container';
import { getSavedSearchContainer } from './discover_saved_search_container';

export interface DiscoverStateContainerParams {
  /**
   * The ID of the tab associated with this state container
   */
  tabId: string;
  /**
   * The current savedSearch
   */
  savedSearch?: string | SavedSearch;
  /**
   * core ui settings service
   */
  services: DiscoverServices;
  /**
   * Context object for customization related properties
   */
  customizationContext: DiscoverCustomizationContext;
  /**
   * URL state storage
   */
  stateStorageContainer: IKbnUrlStateStorage;
  /**
   * Internal shared state that's used at several places in the UI
   */
  internalState: InternalStateStore;
  /**
   * State manager for runtime state that can't be stored in Redux
   */
  runtimeStateManager: RuntimeStateManager;
  /**
   * Manages search sessions and search session URL state
   */
  searchSessionManager: DiscoverSearchSessionManager;
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
   * Internal shared state that's used at several places in the UI
   */
  internalState: InternalStateStore;
  /**
   * @deprecated Do not use, this only exists to support
   * Timeline which accesses the internal state directly
   */
  internalStateActions: typeof internalStateActions;
  /**
   * Injects the current tab into a given internalState action
   */
  injectCurrentTab: TabActionInjector;
  /**
   * Gets the state of the current tab
   */
  getCurrentTab: () => TabState;
  /**
   * State manager for runtime state that can't be stored in Redux
   */
  runtimeStateManager: RuntimeStateManager;
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
   * Context object for customization related properties
   */
  customizationContext: DiscoverCustomizationContext;
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
    initializeAndSync: () => void;
    /**
     * Stop syncing the state containers started by initializeAndSync
     */
    stopSyncing: () => void;
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
     * Triggered when transitioning from ESQL to Dataview
     * Clean ups the ES|QL query and moves to the dataview mode
     */
    transitionFromESQLToDataView: (dataViewId: string) => void;
    /**
     * Triggered when transitioning from ESQL to Dataview
     * Clean ups the ES|QL query and moves to the dataview mode
     */
    transitionFromDataViewToESQL: (dataView: DataView) => void;
    /**
     * Triggered when a saved search is opened in the savedObject finder
     * @param savedSearchId
     */
    onOpenSavedSearch: (savedSearchId: string) => Promise<void>;
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
    onChangeDataView: (id: string | DataView) => Promise<void>;
    /**
     * Set the currently selected data view
     * @param dataView
     */
    setDataView: (dataView: DataView) => void;
    /**
     * When editing an ad hoc data view, a new id needs to be generated for the data view
     * This is to prevent duplicate ids messing with our system
     */
    updateAdHocDataViewId: (editedDataView: DataView) => Promise<DataView | undefined>;
    /**
     * Updates the ES|QL query string
     */
    updateESQLQuery: (queryOrUpdater: string | ((prevQuery: string) => string)) => void;
  };
}

/**
 * Builds and returns appState and globalState containers and helper functions
 * Used to sync URL with UI state
 */
export function getDiscoverStateContainer({
  tabId,
  services,
  customizationContext,
  stateStorageContainer: stateStorage,
  internalState,
  runtimeStateManager,
  searchSessionManager,
}: DiscoverStateContainerParams): DiscoverStateContainer {
  const injectCurrentTab = createTabActionInjector(tabId);
  const getCurrentTab = () => selectTab(internalState.getState(), tabId);

  /**
   * Saved Search State Container, the persisted saved object of Discover
   */
  const savedSearchContainer = getSavedSearchContainer({
    services,
    internalState,
    getCurrentTab,
  });

  /**
   * App State Container, synced with the _a part URL
   */
  const appStateContainer = getDiscoverAppStateContainer({
    tabId,
    stateStorage,
    internalState,
    savedSearchContainer,
    services,
    injectCurrentTab,
  });

  const pauseAutoRefreshInterval = async (dataView: DataView) => {
    if (dataView && (!dataView.isTimeBased() || dataView.type === DataViewType.ROLLUP)) {
      const state = selectTab(internalState.getState(), tabId).globalState;
      if (state?.refreshInterval && !state.refreshInterval.pause) {
        internalState.dispatch(
          injectCurrentTab(internalStateActions.setGlobalState)({
            globalState: {
              ...state,
              refreshInterval: { ...state.refreshInterval, pause: true },
            },
          })
        );
      }
    }
  };

  const setDataView = (dataView: DataView) => {
    internalState.dispatch(injectCurrentTab(internalStateActions.setDataView)({ dataView }));
    pauseAutoRefreshInterval(dataView);
    savedSearchContainer.getState().searchSource.setField('index', dataView);
  };

  const dataStateContainer = getDataStateContainer({
    services,
    searchSessionManager,
    appStateContainer,
    internalState,
    runtimeStateManager,
    savedSearchContainer,
    setDataView,
    injectCurrentTab,
    getCurrentTab,
  });

  /**
   * When editing an ad hoc data view, a new id needs to be generated for the data view
   * This is to prevent duplicate ids messing with our system
   */
  const updateAdHocDataViewId = async (editedDataView: DataView) => {
    const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, tabId);
    const prevDataView = currentDataView$.getValue();
    if (!prevDataView || prevDataView.isPersisted()) return;

    const isUsedInMultipleTabs = selectIsDataViewUsedInMultipleRuntimeTabStates(
      runtimeStateManager,
      prevDataView.id!
    );

    const nextDataView = await services.dataViews.create({
      ...editedDataView.toSpec(),
      id: uuidv4(),
    });

    if (!isUsedInMultipleTabs) {
      services.dataViews.clearInstanceCache(prevDataView.id);
    }

    await updateFiltersReferences({
      prevDataView,
      nextDataView,
      services,
    });

    if (isUsedInMultipleTabs) {
      internalState.dispatch(internalStateActions.appendAdHocDataViews(nextDataView));
    } else {
      internalState.dispatch(
        internalStateActions.replaceAdHocDataViewWithId(prevDataView.id!, nextDataView)
      );
    }

    if (isDataSourceType(appStateContainer.get().dataSource, DataSourceType.DataView)) {
      await appStateContainer.replaceUrlState({
        dataSource: nextDataView.id
          ? createDataViewDataSource({ dataViewId: nextDataView.id })
          : undefined,
      });
    }

    const trackingEnabled = Boolean(nextDataView.isPersisted() || savedSearchContainer.getId());
    services.urlTracker.setTrackingEnabled(trackingEnabled);

    return nextDataView;
  };

  const onOpenSavedSearch = async (newSavedSearchId: string) => {
    addLog('[discoverState] onOpenSavedSearch', newSavedSearchId);
    const { persistedDiscoverSession } = internalState.getState();
    if (persistedDiscoverSession?.id === newSavedSearchId) {
      addLog('[discoverState] undo changes since saved search did not change');
      await internalState.dispatch(internalStateActions.resetDiscoverSession()).unwrap();
    } else {
      addLog('[discoverState] onOpenSavedSearch open view URL');
      services.locator.navigate({
        savedSearchId: newSavedSearchId,
      });
    }
  };

  const transitionFromESQLToDataView = (dataViewId: string) => {
    appStateContainer.update({
      query: {
        language: 'kuery',
        query: '',
      },
      columns: [],
      dataSource: {
        type: DataSourceType.DataView,
        dataViewId,
      },
    });
  };

  const clearTimeFieldFromSort = (
    sort: DiscoverAppState['sort'],
    timeFieldName: string | undefined
  ) => {
    if (!Array.isArray(sort) || !timeFieldName) return sort;

    const filteredSort = sort.filter(([field]) => field !== timeFieldName);

    return filteredSort;
  };

  const transitionFromDataViewToESQL = (dataView: DataView) => {
    const appState = appStateContainer.get();
    const { query, sort } = appState;
    const filterQuery = query && isOfQueryType(query) ? query : undefined;
    const queryString = getInitialESQLQuery(dataView, true, filterQuery);
    const clearedSort = clearTimeFieldFromSort(sort, dataView?.timeFieldName);

    appStateContainer.update({
      query: { esql: queryString },
      filters: [],
      dataSource: {
        type: DataSourceType.Esql,
      },
      columns: [],
      sort: clearedSort,
    });

    // clears pinned filters
    const globalState = selectTab(internalState.getState(), tabId).globalState;
    internalState.dispatch(
      injectCurrentTab(internalStateActions.setGlobalState)({
        globalState: {
          ...globalState,
          filters: [],
        },
      })
    );
  };

  const onDataViewCreated = async (nextDataView: DataView) => {
    if (!nextDataView.isPersisted()) {
      internalState.dispatch(internalStateActions.appendAdHocDataViews(nextDataView));
    } else {
      await internalState.dispatch(internalStateActions.loadDataViewList());
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
      await updateAdHocDataViewId(editedDataView);
    }
    void internalState.dispatch(internalStateActions.loadDataViewList());
    addLog('[getDiscoverStateContainer] onDataViewEdited triggers data fetching');
    fetchData();
  };

  let internalStopSyncing = () => {};

  const stopSyncing = () => {
    internalStopSyncing();
    internalStopSyncing = () => {};
  };

  /**
   * state containers initializing and subscribing to changes triggering e.g. data fetching
   */
  const initializeAndSync = () => {
    const syncLocallyPersistedTabState = () =>
      internalState.dispatch(injectCurrentTab(internalStateActions.syncLocallyPersistedTabState)());

    // This needs to be the first thing that's wired up because initAndSync is pulling the current state from the URL which
    // might change the time filter and thus needs to re-check whether the saved search has changed.
    const timefilerUnsubscribe = merge(
      services.timefilter.getTimeUpdate$(),
      services.timefilter.getRefreshIntervalUpdate$()
    ).subscribe(() => {
      savedSearchContainer.updateTimeRange();
      syncLocallyPersistedTabState();
    });

    // Enable/disable kbn url tracking (That's the URL used when selecting Discover in the side menu)
    const unsubscribeSavedSearchUrlTracking = savedSearchContainer.initUrlTracking();

    // initialize app state container, syncing with _g and _a part of the URL
    const appStateInitAndSyncUnsubscribe = appStateContainer.initAndSync();

    // subscribing to state changes of appStateContainer, triggering data fetching
    const appStateSubscription = appStateContainer.state$.subscribe(
      buildStateSubscribe({
        appState: appStateContainer,
        savedSearchState: savedSearchContainer,
        dataState: dataStateContainer,
        internalState,
        runtimeStateManager,
        services,
        setDataView,
        getCurrentTab,
      })
    );

    const savedSearchChangesSubscription = savedSearchContainer
      .getCurrent$()
      .subscribe(syncLocallyPersistedTabState);

    // start subscribing to dataStateContainer, triggering data fetching
    const unsubscribeData = dataStateContainer.subscribe();

    // updates saved search when query or filters change, triggers data fetching
    const filterUnsubscribe = merge(services.filterManager.getFetches$()).subscribe(() => {
      const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, tabId);
      savedSearchContainer.update({
        nextDataView: currentDataView$.getValue(),
        nextState: appStateContainer.get(),
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
          services.capabilities.discover_v2.storeSearchSession
            ? { disabled: false }
            : {
                disabled: true,
                reasonText: noSearchSessionStorageCapabilityMessage,
              },
      }
    );

    internalStopSyncing = () => {
      savedSearchChangesSubscription.unsubscribe();
      unsubscribeData();
      appStateSubscription.unsubscribe();
      appStateInitAndSyncUnsubscribe();
      unsubscribeSavedSearchUrlTracking();
      filterUnsubscribe.unsubscribe();
      timefilerUnsubscribe.unsubscribe();
    };
  };

  const createAndAppendAdHocDataView = async (dataViewSpec: DataViewSpec) => {
    const newDataView = await services.dataViews.create(dataViewSpec);
    if (newDataView.fields.getByName('@timestamp')?.type === 'date') {
      newDataView.timeFieldName = '@timestamp';
    }
    internalState.dispatch(internalStateActions.appendAdHocDataViews(newDataView));
    await onChangeDataView(newDataView);
    return newDataView;
  };

  const trackQueryFields = (query: Query | AggregateQuery | undefined) => {
    const { scopedEbtManager$ } = selectTabRuntimeState(runtimeStateManager, tabId);
    const scopedEbtManager = scopedEbtManager$.getValue();
    const { fieldsMetadata } = services;

    scopedEbtManager.trackSubmittingQuery({
      query,
      fieldsMetadata,
    });
  };

  /**
   * Triggered when a user submits a query in the search bar
   */
  const onUpdateQuery = (
    payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
    isUpdate?: boolean
  ) => {
    trackQueryFields(payload.query);

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
  const onChangeDataView = async (dataViewId: string | DataView) => {
    await changeDataView({
      dataViewId,
      services,
      internalState,
      runtimeStateManager,
      appState: appStateContainer,
      injectCurrentTab,
      getCurrentTab,
    });
  };

  const fetchData = (initial: boolean = false) => {
    addLog('fetchData', { initial });
    if (!initial || dataStateContainer.getInitialFetchStatus() === FetchStatus.LOADING) {
      dataStateContainer.fetch();
    }
  };

  const updateESQLQuery = (queryOrUpdater: string | ((prevQuery: string) => string)) => {
    addLog('updateESQLQuery');
    const { query: currentQuery } = appStateContainer.get();

    if (!isOfAggregateQueryType(currentQuery)) {
      throw new Error(
        'Cannot update a non-ES|QL query. Make sure this function is only called once in ES|QL mode.'
      );
    }

    const queryUpdater = isFunction(queryOrUpdater) ? queryOrUpdater : () => queryOrUpdater;
    const query = { esql: queryUpdater(currentQuery.esql) };

    appStateContainer.update({ query });
  };

  return {
    appState: appStateContainer,
    internalState,
    internalStateActions,
    injectCurrentTab,
    getCurrentTab,
    runtimeStateManager,
    dataState: dataStateContainer,
    savedSearchState: savedSearchContainer,
    stateStorage,
    searchSessionManager,
    customizationContext,
    actions: {
      initializeAndSync,
      stopSyncing,
      fetchData,
      onChangeDataView,
      createAndAppendAdHocDataView,
      onDataViewCreated,
      onDataViewEdited,
      onOpenSavedSearch,
      transitionFromESQLToDataView,
      transitionFromDataViewToESQL,
      onUpdateQuery,
      setDataView,
      updateAdHocDataViewId,
      updateESQLQuery,
    },
  };
}

export function createSearchSessionRestorationDataProvider(deps: {
  appStateContainer: DiscoverAppStateContainer;
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
  appStateContainer: DiscoverAppStateContainer;
  data: DataPublicPluginStart;
  getSavedSearch: () => SavedSearch;
  shouldRestoreSearchSession: boolean;
}): DiscoverAppLocatorParams {
  const appState = appStateContainer.get();
  const dataView = getSavedSearch().searchSource.getField('index');
  return {
    filters: data.query.filterManager.getFilters(),
    dataViewId: dataView?.id,
    query: appState.query,
    savedSearchId: getSavedSearch().id,
    timeRange: shouldRestoreSearchSession
      ? data.query.timefilter.timefilter.getAbsoluteTime()
      : data.query.timefilter.timefilter.getTime(),
    searchSessionId: shouldRestoreSearchSession ? data.search.session.getSessionId() : undefined,
    columns: appState.columns,
    grid: appState.grid,
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
    ...(shouldRestoreSearchSession
      ? {
          hideChart: appState.hideChart ?? false,
          sampleSize: appState.sampleSize,
        }
      : {}),
  };
}
