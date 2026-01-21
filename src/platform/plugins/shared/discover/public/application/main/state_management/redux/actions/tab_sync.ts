/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineLatest, distinctUntilChanged, map, merge, skip, startWith } from 'rxjs';
import { isEqual } from 'lodash';
import {
  connectToQueryState,
  type GlobalQueryStateFromUrl,
  noSearchSessionStorageCapabilityMessage,
} from '@kbn/data-plugin/public';
import { type INullableBaseStateContainer, syncState } from '@kbn/kibana-utils-plugin/public';
import { FilterStateStore, isOfAggregateQueryType } from '@kbn/es-query';
import { type TabActionPayload, type InternalStateThunkActionCreator } from '../internal_state';
import { selectTab } from '../selectors';
import { selectTabRuntimeState } from '../runtime_state';
import { addLog } from '../../../../../utils/add_log';
import { internalStateActions } from '..';
import type { DiscoverAppState, UrlSyncObservables } from '../types';
import { APP_STATE_URL_KEY, GLOBAL_STATE_URL_KEY } from '../../../../../../common/constants';
import { getCurrentUrlState } from '../../utils/cleanup_url_state';
import { buildStateSubscribe } from '../../utils/build_state_subscribe';
import { createSearchSessionRestorationDataProvider } from '../utils';
import {
  createDataViewDataSource,
  DataSourceType,
  isDataSourceType,
} from '../../../../../../common/data_sources';

/**
 * Create observables and state containers for 2-directional syncing of appState and globalState with the URL
 */
export const createUrlSyncObservables: InternalStateThunkActionCreator<
  [TabActionPayload],
  UrlSyncObservables
> = ({ tabId }) =>
  function createUrlSyncObservablesThunkFn(dispatch, getState, { runtimeStateManager }) {
    const { internalState$ } = runtimeStateManager;

    if (!internalState$) {
      throw new Error('Internal state observable is not available in runtime state manager');
    }

    const getAppState = (): DiscoverAppState => {
      return selectTab(getState(), tabId).appState;
    };

    const appState$ = internalState$.pipe(
      map(getAppState),
      distinctUntilChanged((a, b) => isEqual(a, b)),
      skip(1)
    );

    const appStateContainer: INullableBaseStateContainer<DiscoverAppState> = {
      get: () => getAppState(),
      set: (appState) => {
        if (!appState) {
          return;
        }

        dispatch(internalStateActions.setAppState({ tabId, appState }));
      },
      state$: appState$,
    };

    const getGlobalState = (): GlobalQueryStateFromUrl => {
      const tabState = selectTab(getState(), tabId);
      const { timeRange: time, refreshInterval, filters } = tabState.globalState;

      return { time, refreshInterval, filters };
    };

    const globalState$ = internalState$.pipe(
      map(getGlobalState),
      distinctUntilChanged((a, b) => isEqual(a, b)),
      skip(1)
    );

    const globalStateContainer: INullableBaseStateContainer<GlobalQueryStateFromUrl> = {
      get: () => getGlobalState(),
      set: (state) => {
        if (!state) {
          return;
        }

        const { time: timeRange, refreshInterval, filters } = state;

        dispatch(
          internalStateActions.setGlobalState({
            tabId,
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

    return {
      appState$,
      appStateContainer,
      globalState$,
      globalStateContainer,
    };
  };

/**
 * Initializing state containers and start subscribing to changes triggering e.g. data fetching
 */
export const initializeAndSync: InternalStateThunkActionCreator<[TabActionPayload]> = ({ tabId }) =>
  function initializeAndSyncThunkFn(
    dispatch,
    getState,
    { services, runtimeStateManager, urlStateStorage }
  ) {
    const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
    const stateContainer = tabRuntimeState.stateContainer$.getValue();

    if (!stateContainer) {
      throw new Error('State container is not initialized');
    }

    const savedSearchContainer = stateContainer.savedSearchState;
    const { appState$, appStateContainer, globalStateContainer } =
      tabRuntimeState.urlSyncObservables;

    const getCurrentTab = () => selectTab(getState(), tabId);
    const getAppState = (): DiscoverAppState => {
      return selectTab(getState(), tabId).appState;
    };

    const initializeUrlTracking = () => {
      const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, tabId);

      const subscription = combineLatest([
        currentDataView$,
        appState$.pipe(startWith(getAppState())),
      ]).subscribe(([dataView, appState]) => {
        if (!dataView?.id) {
          return;
        }

        const dataViewSupportsTracking =
          // Disable for ad hoc data views, since they can't be restored after a page refresh
          dataView.isPersisted() ||
          // Unless it's a default profile data view, which can be restored on refresh
          getState().defaultProfileAdHocDataViewIds.includes(dataView.id) ||
          // Or we're in ES|QL mode, in which case we don't care about the data view
          isOfAggregateQueryType(appState.query);

        const { persistedDiscoverSession } = getState();
        const trackingEnabled = dataViewSupportsTracking || Boolean(persistedDiscoverSession?.id);

        services.urlTracker.setTrackingEnabled(trackingEnabled);
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    const initializeAndSyncUrlState = () => {
      const currentSavedSearch = savedSearchContainer.getState();

      addLog('[appState] initialize state and sync with URL', currentSavedSearch);

      // Set the default profile state only if not loading a saved search,
      // to avoid overwriting saved search state
      if (!currentSavedSearch.id) {
        const { breakdownField, columns, rowHeight, hideChart } = getCurrentUrlState(
          urlStateStorage,
          services
        );

        // Only set default state which is not already set in the URL
        dispatch(
          internalStateActions.setResetDefaultProfileState({
            tabId,
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
        dispatch(
          internalStateActions.updateAppState({
            tabId,
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
        stateStorage: urlStateStorage,
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
          dispatch(internalStateActions.markNonActiveTabsForRefetch());
          addLog('[getDiscoverStateContainer] projectRouting changes triggers data fetching');
          dispatch(internalStateActions.fetchData({ tabId }));
        });

      const { start: startSyncingGlobalStateWithUrl, stop: stopSyncingGlobalStateWithUrl } =
        syncState({
          storageKey: GLOBAL_STATE_URL_KEY,
          stateContainer: globalStateContainer,
          stateStorage: urlStateStorage,
        });

      // current state needs to be pushed to url
      dispatch(internalStateActions.pushCurrentTabStateToUrl({ tabId })).then(() => {
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

    const syncLocallyPersistedTabState = () =>
      dispatch(
        internalStateActions.syncLocallyPersistedTabState({
          tabId,
        })
      );

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
        dataState: stateContainer.dataState,
        internalState: stateContainer.internalState,
        runtimeStateManager,
        services,
        getCurrentTab,
      })
    );

    const savedSearchChangesSubscription = savedSearchContainer
      .getCurrent$()
      .subscribe(syncLocallyPersistedTabState);

    // start subscribing to dataStateContainer, triggering data fetching
    const unsubscribeData = stateContainer.dataState.subscribe();

    // updates saved search when query or filters change, triggers data fetching
    const filterUnsubscribe = merge(services.filterManager.getFetches$()).subscribe(() => {
      const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, tabId);
      savedSearchContainer.update({
        nextDataView: currentDataView$.getValue(),
        nextState: getAppState(),
        useFilterAndQueryServices: true,
      });
      addLog('[getDiscoverStateContainer] filter changes triggers data fetching');
      dispatch(
        internalStateActions.fetchData({
          tabId,
        })
      );
    });

    services.data.search.session.enableStorage(
      createSearchSessionRestorationDataProvider({
        data: services.data,
        getPersistedDiscoverSession: () => getState().persistedDiscoverSession,
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

    const unsubscribeFn = () => {
      savedSearchChangesSubscription.unsubscribe();
      unsubscribeData();
      appStateSubscription.unsubscribe();
      unsubscribeUrlState();
      unsubscribeUrlTracking();
      filterUnsubscribe.unsubscribe();
      timefilerUnsubscribe.unsubscribe();
    };

    tabRuntimeState.onSubscribe({ unsubscribeFn });
  };

/**
 * Stop syncing the state containers started by initializeAndSync
 */
export const stopSyncing: InternalStateThunkActionCreator<[TabActionPayload]> = ({ tabId }) =>
  function stopSyncingThunkFn(dispatch, getState, { runtimeStateManager }) {
    const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, tabId);
    tabRuntimeState.unsubscribe();
  };
