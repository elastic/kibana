/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  syncState,
  type IKbnUrlStateStorage,
  type INullableBaseStateContainer,
} from '@kbn/kibana-utils-plugin/public';
import type {
  DataPublicPluginStart,
  GlobalQueryStateFromUrl,
  SearchSessionInfoProvider,
} from '@kbn/data-plugin/public';
import {
  connectToQueryState,
  noSearchSessionStorageCapabilityMessage,
} from '@kbn/data-plugin/public';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import { DataViewType } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import type { Observable } from 'rxjs';
import { combineLatest, distinctUntilChanged, from, map, merge, skip, startWith } from 'rxjs';
import { FilterStateStore, isOfAggregateQueryType } from '@kbn/es-query';
import { isEqual } from 'lodash';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverServices } from '../../..';
import { FetchStatus } from '../../types';
import { changeDataView } from './utils/change_data_view';
import { buildStateSubscribe } from './utils/build_state_subscribe';
import { addLog } from '../../../utils/add_log';
import type { DiscoverDataStateContainer } from './discover_data_state_container';
import { getDataStateContainer } from './discover_data_state_container';
import type { DiscoverSearchSessionManager } from './discover_search_session';
import type { DiscoverAppLocatorParams } from '../../../../common';
import { APP_STATE_URL_KEY, DISCOVER_APP_LOCATOR } from '../../../../common';
import type { DiscoverAppState, ReactiveTabRuntimeState } from './redux';
import { getCurrentUrlState } from './utils/cleanup_url_state';
import { updateFiltersReferences } from './utils/update_filter_references';
import type { DiscoverCustomizationContext } from '../../../customizations';
import {
  createDataViewDataSource,
  DataSourceType,
  isDataSourceType,
} from '../../../../common/data_sources';
import type {
  DiscoverInternalState,
  InternalStateStore,
  RuntimeStateManager,
  TabActionInjector,
  TabState,
} from './redux';
import {
  createTabActionInjector,
  internalStateActions,
  selectTab,
  selectTabRuntimeState,
  selectIsDataViewUsedInMultipleRuntimeTabStates,
} from './redux';
import type { DiscoverSavedSearchContainer } from './discover_saved_search_container';
import { getSavedSearchContainer } from './discover_saved_search_container';
import { GLOBAL_STATE_URL_KEY } from '../../../../common/constants';

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
   * An observable of the current tab's app state
   */
  appState$: Observable<DiscoverAppState>;
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
     * Triggered when a saved search is opened in the savedObject finder
     * @param savedSearchId
     */
    onOpenSavedSearch: (savedSearchId: string) => Promise<void>;
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
    getCurrentTab,
  });

  const pauseAutoRefreshInterval = async (dataView: DataView) => {
    if (dataView && (!dataView.isTimeBased() || dataView.type === DataViewType.ROLLUP)) {
      const state = selectTab(internalState.getState(), tabId).globalState;
      if (state?.refreshInterval && !state.refreshInterval.pause) {
        internalState.dispatch(
          injectCurrentTab(internalStateActions.updateGlobalState)({
            globalState: {
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

    if (isDataSourceType(getCurrentTab().appState.dataSource, DataSourceType.DataView)) {
      await internalState.dispatch(
        injectCurrentTab(internalStateActions.updateAppStateAndReplaceUrl)({
          appState: {
            dataSource: nextDataView.id
              ? createDataViewDataSource({ dataViewId: nextDataView.id })
              : undefined,
          },
        })
      );
    }

    const { persistedDiscoverSession } = internalState.getState();
    const trackingEnabled = Boolean(nextDataView.isPersisted() || persistedDiscoverSession?.id);
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

  const getAppState = (state: DiscoverInternalState): DiscoverAppState => {
    return selectTab(state, tabId).appState;
  };

  const appState$ = from(internalState).pipe(
    map(getAppState),
    distinctUntilChanged((a, b) => isEqual(a, b)),
    skip(1)
  );

  const appStateContainer: INullableBaseStateContainer<DiscoverAppState> = {
    get: () => getAppState(internalState.getState()),
    set: (appState) => {
      if (!appState) {
        return;
      }

      internalState.dispatch(injectCurrentTab(internalStateActions.setAppState)({ appState }));
    },
    state$: appState$,
  };

  const getGlobalState = (state: DiscoverInternalState): GlobalQueryStateFromUrl => {
    const tabState = selectTab(state, tabId);
    const { timeRange: time, refreshInterval, filters } = tabState.globalState;

    return { time, refreshInterval, filters };
  };

  const globalState$ = from(internalState).pipe(
    map(getGlobalState),
    distinctUntilChanged((a, b) => isEqual(a, b)),
    skip(1)
  );

  const globalStateContainer: INullableBaseStateContainer<GlobalQueryStateFromUrl> = {
    get: () => getGlobalState(internalState.getState()),
    set: (state) => {
      if (!state) {
        return;
      }

      const { time: timeRange, refreshInterval, filters } = state;

      internalState.dispatch(
        injectCurrentTab(internalStateActions.setGlobalState)({
          globalState: {
            timeRange,
            refreshInterval,
            filters,
          },
        })
      );
    },
    state$: globalState$,
  };

  const initializeAndSyncUrlState = () => {
    const currentSavedSearch = savedSearchContainer.getState();

    addLog('[appState] initialize state and sync with URL', currentSavedSearch);

    // Set the default profile state only if not loading a saved search,
    // to avoid overwriting saved search state
    if (!currentSavedSearch.id) {
      const { breakdownField, columns, rowHeight, hideChart } = getCurrentUrlState(
        stateStorage,
        services
      );

      // Only set default state which is not already set in the URL
      internalState.dispatch(
        injectCurrentTab(internalStateActions.setResetDefaultProfileState)({
          resetDefaultProfileState: {
            columns: columns === undefined,
            rowHeight: rowHeight === undefined,
            breakdownField: breakdownField === undefined,
            hideChart: hideChart === undefined,
          },
        })
      );
    }

    const { data } = services;
    const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, tabId);
    const currentDataView = currentDataView$.getValue();
    const appState = appStateContainer.get();
    const setDataViewFromSavedSearch =
      !appState.dataSource ||
      (isDataSourceType(appState.dataSource, DataSourceType.DataView) &&
        appState.dataSource.dataViewId !== currentDataView?.id);

    if (setDataViewFromSavedSearch) {
      // used data view is different from the given by url/state which is invalid
      internalState.dispatch(
        injectCurrentTab(internalStateActions.updateAppState)({
          appState: {
            dataSource: currentDataView?.id
              ? createDataViewDataSource({ dataViewId: currentDataView.id })
              : undefined,
          },
        })
      );
    }

    // syncs `_a` portion of url with query services
    const stopSyncingQueryAppStateWithStateContainer = connectToQueryState(
      data.query,
      appStateContainer,
      {
        filters: FilterStateStore.APP_STATE,
        query: true,
      }
    );

    const { start: startSyncingAppStateWithUrl, stop: stopSyncingAppStateWithUrl } = syncState({
      storageKey: APP_STATE_URL_KEY,
      stateContainer: appStateContainer,
      stateStorage,
    });

    // syncs `_g` portion of url with query services
    const stopSyncingQueryGlobalStateWithStateContainer = connectToQueryState(
      data.query,
      globalStateContainer,
      {
        refreshInterval: true,
        time: true,
        filters: FilterStateStore.GLOBAL_STATE,
      }
    );

    // Subscribe to CPS projectRouting changes (global subscription affects all tabs)
    // When projectRouting changes, mark non-active tabs for refetch and trigger data fetch
    const cpsProjectRoutingSubscription = services.cps?.cpsManager
      ?.getProjectRouting$()
      .subscribe(() => {
        internalState.dispatch(internalStateActions.markNonActiveTabsForRefetch());
        addLog('[getDiscoverStateContainer] projectRouting changes triggers data fetching');
        fetchData();
      });

    const { start: startSyncingGlobalStateWithUrl, stop: stopSyncingGlobalStateWithUrl } =
      syncState({
        storageKey: GLOBAL_STATE_URL_KEY,
        stateContainer: globalStateContainer,
        stateStorage,
      });

    // current state needs to be pushed to url
    internalState
      .dispatch(injectCurrentTab(internalStateActions.pushCurrentTabStateToUrl)())
      .then(() => {
        startSyncingAppStateWithUrl();
        startSyncingGlobalStateWithUrl();
      });

    return () => {
      stopSyncingQueryAppStateWithStateContainer();
      stopSyncingQueryGlobalStateWithStateContainer();
      stopSyncingAppStateWithUrl();
      stopSyncingGlobalStateWithUrl();
      cpsProjectRoutingSubscription?.unsubscribe();
    };
  };

  const initializeUrlTracking = () => {
    const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, tabId);

    const subscription = combineLatest([
      currentDataView$,
      appState$.pipe(startWith(getAppState(internalState.getState()))),
    ]).subscribe(([dataView, appState]) => {
      if (!dataView?.id) {
        return;
      }

      const dataViewSupportsTracking =
        // Disable for ad hoc data views, since they can't be restored after a page refresh
        dataView.isPersisted() ||
        // Unless it's a default profile data view, which can be restored on refresh
        internalState.getState().defaultProfileAdHocDataViewIds.includes(dataView.id) ||
        // Or we're in ES|QL mode, in which case we don't care about the data view
        isOfAggregateQueryType(appState.query);

      const { persistedDiscoverSession } = internalState.getState();
      const trackingEnabled = dataViewSupportsTracking || Boolean(persistedDiscoverSession?.id);

      services.urlTracker.setTrackingEnabled(trackingEnabled);
    });

    return () => {
      subscription.unsubscribe();
    };
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

    // This needs to be the first thing that's wired up because initializeAndSyncUrlState is pulling the current state from the URL which
    // might change the time filter and thus needs to re-check whether the saved search has changed.
    const timefilerUnsubscribe = merge(
      services.timefilter.getTimeUpdate$(),
      services.timefilter.getRefreshIntervalUpdate$()
    ).subscribe(() => {
      savedSearchContainer.updateTimeRange();
      syncLocallyPersistedTabState();
    });

    // Enable/disable kbn url tracking (That's the URL used when selecting Discover in the side menu)
    const unsubscribeUrlTracking = initializeUrlTracking();

    // initialize syncing with _g and _a part of the URL
    const unsubscribeUrlState = initializeAndSyncUrlState();

    // subscribing to state changes of appStateContainer, triggering data fetching
    const appStateSubscription = appStateContainer.state$.subscribe(
      buildStateSubscribe({
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
        nextState: getCurrentTab().appState,
        useFilterAndQueryServices: true,
      });
      addLog('[getDiscoverStateContainer] filter changes triggers data fetching');
      fetchData();
    });

    services.data.search.session.enableStorage(
      createSearchSessionRestorationDataProvider({
        data: services.data,
        getPersistedDiscoverSession: () => internalState.getState().persistedDiscoverSession,
        getCurrentTab,
        getCurrentTabRuntimeState: () => selectTabRuntimeState(runtimeStateManager, tabId),
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
      unsubscribeUrlState();
      unsubscribeUrlTracking();
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

  /**
   * Function e.g. triggered when user changes data view in the sidebar
   */
  const onChangeDataView = async (dataViewId: string | DataView) => {
    await changeDataView({
      dataViewId,
      services,
      internalState,
      runtimeStateManager,
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

  return {
    appState$,
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
      setDataView,
      updateAdHocDataViewId,
    },
  };
}

export function createSearchSessionRestorationDataProvider(deps: {
  data: DataPublicPluginStart;
  getPersistedDiscoverSession: () => DiscoverSession | undefined;
  getCurrentTab: () => TabState;
  getCurrentTabRuntimeState: () => ReactiveTabRuntimeState;
}): SearchSessionInfoProvider {
  return {
    getName: async () => {
      return (
        deps.getPersistedDiscoverSession()?.title ||
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
          shouldRestoreSearchSession: false,
        }),
        restoreState: createUrlGeneratorState({
          ...deps,
          shouldRestoreSearchSession: true,
        }),
      };
    },
  };
}

function createUrlGeneratorState({
  data,
  getPersistedDiscoverSession,
  getCurrentTab,
  getCurrentTabRuntimeState,
  shouldRestoreSearchSession,
}: {
  data: DataPublicPluginStart;
  getPersistedDiscoverSession: () => DiscoverSession | undefined;
  getCurrentTab: () => TabState;
  getCurrentTabRuntimeState: () => ReactiveTabRuntimeState;
  shouldRestoreSearchSession: boolean;
}): DiscoverAppLocatorParams {
  const appState = getCurrentTab().appState;
  const dataView = getCurrentTabRuntimeState().currentDataView$.getValue();
  return {
    filters: data.query.filterManager.getFilters(),
    dataViewId: dataView?.id,
    query: appState.query,
    savedSearchId: getPersistedDiscoverSession()?.id,
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
