/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isEqual } from 'lodash';
import { merge } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { History } from 'history';
import { AggregateQuery, COMPARE_ALL_OPTIONS, compareFilters, Filter, Query } from '@kbn/es-query';
import {
  createKbnUrlStateStorage,
  ReduxLikeStateContainer,
  StateContainer,
  withNotifyOnErrors,
} from '@kbn/kibana-utils-plugin/public';
import {
  DataPublicPluginStart,
  QueryState,
  SearchSessionInfoProvider,
} from '@kbn/data-plugin/public';
import { getEmptySavedSearch, SavedSearch } from '@kbn/saved-search-plugin/public';
import { DataViewSpec, TimeRange } from '@kbn/data-plugin/common';
import React, { useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { buildStateSubscribe } from '../hooks/utiles/build_state_subscribe';
import { loadDataViewBySavedSearch } from '../load_data_view_by_saved_search';
import { addLog } from '../../../utils/addLog';
import {
  DiscoverInternalState,
  getInternalStateContainer,
} from './discover_internal_state_container';
import {
  AppState,
  AppStateContainer,
  getDiscoverAppStateContainer,
} from './discover_app_state_container';
import { DataStateContainer, getDataStateContainer } from './discover_data_state_container';
import { getSavedSearchContainer, SavedSearchContainer } from './discover_saved_search_container';
import { DiscoverServices } from '../../../build_services';
import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '../../../locator';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { loadSavedSearch } from '../utils/load_saved_search';

export interface AppStateUrl extends Omit<AppState, 'sort'> {
  /**
   * Necessary to take care of legacy links [fieldName,direction]
   */
  sort?: string[][] | [string, string];
}

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
  appStateContainer: AppStateContainer;

  internalStateContainer: DiscoverInternalState;

  savedSearchContainer: SavedSearchContainer;

  dataStateContainer: DataStateContainer;
  /**
   * Set app state to with a partial new app state
   */
  setAppState: (newState: Partial<AppState>, replace?: boolean) => void;
  /**
   * Sync state to URL, used for testing
   */
  flushToUrl: () => void;

  actions: {
    onOpenSavedSearch: (newSavedSearchId: string) => void;
    onUpdateQuery: (
      payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
      isUpdate?: boolean
    ) => void;
    onSubmitQuery: (
      payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
      isUpdate?: boolean
    ) => void;
    updateSavedQueryId: (newSavedQueryId: string | undefined) => void;
    /**
     * Pause the auto refresh interval without pushing an entry to history
     */
    pauseAutoRefreshInterval: () => Promise<void>;
    /**
     * Trigger data fetching, by reset=true the loading indicator is displayed.
     * Previous data state is cleared
     * @param reset
     */
    fetch: (reset?: boolean) => void;
    changeDataView: (id: string) => void;
    changeDataViewId: (id: string) => void;
    loadSavedSearch: (
      id: string,
      dataViewSpec: DataViewSpec | undefined,
      onError: (e: Error) => void
    ) => void;
    loadNewSavedSearch: (
      dataViewSpec: DataViewSpec | undefined,
      onError: (e: Error) => void
    ) => void;
    initSyncSubscribe: () => () => void;
    newSavedSearch: () => void;
  };
}

const GLOBAL_STATE_URL_KEY = '_g';

/**
 * Builds and returns appState and globalState containers and helper functions
 * Used to sync URL with UI state
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

  const setAppState = appStateContainer.update;

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
    appStateContainer,
    savedSearchContainer,
  });

  const internalStateContainer = getInternalStateContainer();

  return {
    appStateContainer,
    internalStateContainer,
    dataStateContainer,
    savedSearchContainer,
    setAppState,
    flushToUrl: () => stateStorage.kbnUrlControls.flush(),
    actions: {
      onOpenSavedSearch: async (newSavedSearchId: string) => {
        addLog('🧭 [discoverState] onOpenSavedSearch', newSavedSearchId);
        const currentSavedSearch = savedSearchContainer.savedSearch$.getValue();
        if (currentSavedSearch.id && currentSavedSearch.id === newSavedSearchId) {
          addLog("🧭 [discoverState] onOpenSavedSearch just reset since id didn't change");
          const nextSavedSearch = await savedSearchContainer.reset(currentSavedSearch.id);
          await appStateContainer.reset(nextSavedSearch);
        } else {
          addLog('🧭 [discoverState] onOpenSavedSearch open view URL');
          history.push(`/view/${encodeURIComponent(newSavedSearchId)}`);
        }
      },
      pauseAutoRefreshInterval,
      updateSavedQueryId: (newSavedQueryId: string | undefined) => {
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
      },
      /**
       * Function triggered when the user changes the query in the search bar
       */
      onSubmitQuery: (_, isUpdate?: boolean) => {
        if (isUpdate === false) {
          searchSessionManager.removeSearchSessionIdFromURL({ replace: false });
          dataStateContainer.refetch$.next(undefined);
        }
      },
      /**
       * Function triggered when the user changes the query in the search bar
       */
      onUpdateQuery: (args) => {},
      fetch: (reset?: boolean) => {
        const msg = reset ? 'reset' : undefined;
        dataStateContainer.refetch$.next(msg);
      },
      changeDataView: async (id: string) => {
        setAppState({ index: id });
        return;
      },
      changeDataViewId: async (id: string) => {
        await setAppState({ index: id }, true);
      },
      loadSavedSearch: async (
        id: string,
        dataViewSpec: DataViewSpec | undefined,
        onError: (e: Error) => void
      ) => {
        const currentSavedSearch = await loadSavedSearch(id, {
          services,
          appStateContainer,
          internalStateContainer,
          setError: onError,
          dataViewSpec,
        });
        if (currentSavedSearch) {
          await savedSearchContainer.set(currentSavedSearch);
          if (!appStateContainer.isEmptyURL()) {
            await savedSearchContainer.update(
              currentSavedSearch.searchSource.getField('index'),
              appStateContainer.getState()
            );
          }
          await appStateContainer.reset(currentSavedSearch);
          internalStateContainer.transitions.setDataView(
            currentSavedSearch.searchSource.getField('index')!
          );
        }
        return currentSavedSearch;
      },
      loadNewSavedSearch: async (
        dataViewSpec: DataViewSpec | undefined,
        onError: (e: Error) => void
      ) => {
        addLog('🧭 [discoverState] loadNewSavedSearch');
        const nextSavedSearch = await savedSearchContainer.new();
        addLog('🧭 [discoverState] loadNewSavedSearch', nextSavedSearch);
        if (!appStateContainer.isEmptyURL()) {
          addLog('🧭 [discoverState] update by given state since URL is not empty');
          await savedSearchContainer.update(
            nextSavedSearch.searchSource.getField('index'),
            appStateContainer.getState()
          );
        }

        const nextDataView = await loadDataViewBySavedSearch(
          nextSavedSearch,
          appStateContainer,
          internalStateContainer,
          services,
          onError,
          dataViewSpec
        );
        if (nextDataView) {
          nextSavedSearch.searchSource.setField('index', nextDataView);
          internalStateContainer.transitions.setDataView(nextDataView);
        }
        appStateContainer.reset(nextSavedSearch);
        await savedSearchContainer.update(nextDataView, appStateContainer.getState(), true);
        addLog('🧭 [discoverState] loadNewSavedSearch result', nextSavedSearch);
        return nextSavedSearch;
      },
      newSavedSearch: async () => {
        addLog('🧭 [discoverState] newSavedSearch result');
        const nextSavedSearch = await savedSearchContainer.new();
        appStateContainer.reset(nextSavedSearch);
      },
      initSyncSubscribe: () => {
        const unsubscribeData = dataStateContainer.subscribe();
        const stopSync = appStateContainer.initAndSync(savedSearchContainer.get());
        const unsubscribe = appStateContainer.subscribe(
          buildStateSubscribe({
            appStateContainer,
            internalStateContainer,
            savedSearchContainer,
            dataStateContainer,
            services,
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
          dataStateContainer.refetch$.next(undefined);
        });

        return () => {
          stopSync();
          unsubscribe();
          unsubscribeData();
          filterUnsubscribe.unsubscribe();
        };
      },
    },
  };
}

function createStateHelpers() {
  const context = React.createContext<DiscoverStateContainer | null>(null);
  const useContainer = () => useContext(context);
  const useSavedSearch = () => {
    const container = useContainer();
    return useObservable<SavedSearch>(
      container!.savedSearchContainer.savedSearch$,
      container!.savedSearchContainer.savedSearch$.getValue()
    );
  };
  return {
    Provider: context.Provider,
    useSavedSearch,
  };
}

export const { Provider: DiscoverStateProvider, useSavedSearch } = createStateHelpers();

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
  };
}
