/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep, isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { History } from 'history';
import {
  Filter,
  FilterStateStore,
  compareFilters,
  COMPARE_ALL_OPTIONS,
  Query,
  AggregateQuery,
} from '@kbn/es-query';
import {
  createKbnUrlStateStorage,
  createStateContainer,
  createStateContainerReactHelpers,
  ReduxLikeStateContainer,
  StateContainer,
  syncState,
  withNotifyOnErrors,
} from '@kbn/kibana-utils-plugin/public';
import {
  AutoRefreshDoneFn,
  connectToQueryState,
  DataPublicPluginStart,
  QueryState,
  SearchSessionInfoProvider,
  syncQueryStateWithUrl,
} from '@kbn/data-plugin/public';
import { getSavedSearch, SavedSearch } from '@kbn/saved-search-plugin/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { BehaviorSubject, Subject } from 'rxjs';
import { TimeRange } from '@kbn/data-plugin/common';
import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';
import { persistSavedSearch } from '../utils/persist_saved_search';
import { SEARCH_ON_PAGE_LOAD_SETTING } from '../../../../common';
import { FetchStatus } from '../../types';
import { restoreStateFromSavedSearch } from '../../../services/saved_searches/restore_from_saved_search';
import { getStateDefaults } from '../utils/get_state_defaults';
import { DiscoverServices } from '../../../build_services';
import { DiscoverGridSettings } from '../../../components/discover_grid/types';
import { handleSourceColumnState } from '../../../utils/state_helpers';
import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '../../../locator';
import { VIEW_MODE } from '../../../components/view_mode_toggle';
import { cleanupUrlState } from '../utils/cleanup_url_state';
import { getValidFilters } from '../../../utils/get_valid_filters';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { getRawRecordType } from '../utils/get_raw_record_type';
import { getFetch$ } from '../utils/get_fetch_observable';
import { validateTimeRange } from '../utils/validate_time_range';
import { fetchAll } from '../utils/fetch_all';
import { sendResetMsg } from '../hooks/use_saved_search_messages';
import {
  DataAvailableFieldsMsg,
  DataChartsMessage,
  DataDocumentsMsg,
  DataMainMsg,
  DataRefetch$,
  DataRefetchMsg,
  DataTotalHitsMsg,
  SavedSearchData,
} from '../hooks/use_saved_search';

export interface AppState {
  /**
   * Columns displayed in the table
   */
  columns?: string[];
  /**
   * Array of applied filters
   */
  filters?: Filter[];
  /**
   * Data Grid related state
   */
  grid?: DiscoverGridSettings;
  /**
   * Hide chart
   */
  hideChart?: boolean;
  /**
   * id of the used data view
   */
  index?: string;
  /**
   * Used interval of the histogram
   */
  interval?: string;
  /**
   * Lucence or KQL query
   */
  query?: Query | AggregateQuery;
  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort?: string[][];
  /**
   * id of the used saved query
   */
  savedQuery?: string;
  /**
   * Table view: Documents vs Field Statistics
   */
  viewMode?: VIEW_MODE;
  /**
   * Hide mini distribution/preview charts when in Field Statistics mode
   */
  hideAggregatedPreview?: boolean;
  /**
   * Document explorer row height option
   */
  rowHeight?: number;
  /**
   * Number of rows in the grid per page
   */
  rowsPerPage?: number;
}

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
  savedSearch: SavedSearch;
  /**
   * core ui settings service
   */
  services: DiscoverServices;
}

export interface DiscoverStateContainer {
  /**
   * App state, the _a part of the URL
   */
  appStateContainer: ReduxLikeStateContainer<AppState>;

  savedSearchContainer: {
    savedSearch$: BehaviorSubject<SavedSearch>;
    set: (savedSearch: SavedSearch) => void;
    reset: (id: string | undefined) => Promise<SavedSearch>;
  };

  dataStateContainer: {
    fetch: () => void;
    data$: SavedSearchData;
    refetch$: DataRefetch$;
    subscribe: () => () => void;
    reset: () => void;
    inspectorAdapters: { requests: RequestAdapter };
    initialFetchStatus: FetchStatus;
  };
  /**
   * Initialize state with filters and query,  start state syncing
   */
  initializeAndSync: () => () => void;
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

  actions: {
    resetSavedSearch: (id: string) => void;
    onOpenSavedSearch: (newSavedSearchId: string) => void;
    onUpdateQuery: (
      payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
      isUpdate?: boolean
    ) => void;
    updateSavedQueryId: (newSavedQueryId: string | undefined) => void;
    /**
     * Pause the auto refresh interval without pushing an entry to history
     */
    pauseAutoRefreshInterval: () => Promise<void>;
    fetch: (reset?: boolean) => void;
    persistSavedSearch: (
      savedSearch: SavedSearch,
      params: {
        onError: (error: Error, savedSearch: SavedSearch) => void;
        onSuccess: (id: string) => void;
        saveOptions: SavedObjectSaveOpts;
      }
    ) => Promise<any>;
  };
}

export const {
  Provider,
  Consumer,
  context,
  useContainer,
  useState,
  useTransitions,
  useSelector,
  connect,
} = createStateContainerReactHelpers<ReduxLikeStateContainer<AppState>>();

const APP_STATE_URL_KEY = '_a';
const GLOBAL_STATE_URL_KEY = '_g';

function getSavedSearchContainer({
  savedSearch,
  services,
}: {
  savedSearch: SavedSearch;
  services: DiscoverServices;
}) {
  const savedSearch$ = new BehaviorSubject(savedSearch);
  const set = (newSavedSearch: SavedSearch) => {
    savedSearch$.next(newSavedSearch);
  };
  const reset = async (id: string | undefined) => {
    // any undefined if means it's a new saved search generated
    const newSavedSearch = await getSavedSearch(id, {
      search: services.data.search,
      savedObjectsClient: services.core.savedObjects.client,
      spaces: services.spaces,
      savedObjectsTagging: services.savedObjectsTagging,
    });

    restoreStateFromSavedSearch({
      savedSearch: newSavedSearch,
      timefilter: services.timefilter,
    });

    savedSearch$.next(newSavedSearch);
    return newSavedSearch;
  };
  const persist = (
    nextSavedSearch: SavedSearch,
    {
      onError,
      onSuccess,
      saveOptions,
      state,
    }: {
      onError: (error: Error, savedSearch: SavedSearch) => void;
      onSuccess: (id: string) => void;
      saveOptions: SavedObjectSaveOpts;
      state: AppState;
    }
  ) => {
    return persistSavedSearch(nextSavedSearch, {
      dataView: nextSavedSearch.searchSource.getField('index')!,
      onError,
      onSuccess,
      state,
      services,
      saveOptions,
    });
  };

  const hasChanged = () => {
    return !isEqual(savedSearch, savedSearch$.getValue());
  };

  return {
    savedSearch$,
    set,
    reset,
    hasChanged,
    persist,
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
}: GetStateParams): DiscoverStateContainer {
  const storeInSessionStorage = services.uiSettings.get('state:storeInSessionStorage');
  const toasts = services.core.notifications.toasts;
  const defaultAppState = getStateDefaults({
    savedSearch,
    services,
  });
  const savedSearchContainer = getSavedSearchContainer({ savedSearch, services });
  const savedSearch$ = savedSearchContainer.savedSearch$;
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

  const appStateFromUrl = cleanupUrlState(stateStorage.get(APP_STATE_URL_KEY) as AppStateUrl);

  let initialAppState = handleSourceColumnState(
    savedSearch.id
      ? { ...defaultAppState }
      : {
          ...defaultAppState,
          ...appStateFromUrl,
        },
    services.uiSettings
  );
  // todo filter source depending on fields fetching flag (if no columns remain and source fetching is enabled, use default columns)
  let previousAppState: AppState = {};
  const appStateContainer = createStateContainer<AppState>(initialAppState);

  const appStateContainerModified = {
    ...appStateContainer,
    set: (value: AppState | null) => {
      if (value) {
        previousAppState = appStateContainer.getState();
        appStateContainer.set(value);
      }
    },
  };

  // Calling syncState from within initializeAndSync causes state syncing issues.
  // syncState takes a snapshot of the initial state when it's called to compare
  // against before syncing state updates. When syncState is called from outside
  // of initializeAndSync, the snapshot doesn't get reset when the data view is
  // changed. Then when the user presses the back button, the new state appears
  // to be the same as the initial state, so syncState ignores the update.
  const syncAppState = () =>
    syncState({
      storageKey: APP_STATE_URL_KEY,
      stateContainer: appStateContainerModified,
      stateStorage,
    });

  const replaceUrlAppState = async (newPartial: AppState = {}) => {
    const state = { ...appStateContainer.getState(), ...newPartial };
    await stateStorage.set(APP_STATE_URL_KEY, state, { replace: true });
  };

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

  const initializeAndSync = () => {
    const dataView = savedSearchContainer.savedSearch$.getValue().searchSource.getField('index');
    const { filterManager, data } = services;
    if (appStateContainer.getState().index !== dataView?.id) {
      // used data view is different than the given by url/state which is invalid
      setState(appStateContainerModified, { index: dataView?.id });
    }
    // sync initial app filters from state to filterManager
    const filters = appStateContainer.getState().filters;
    if (filters) {
      filterManager.setAppFilters(cloneDeep(filters));
    }
    const query = appStateContainer.getState().query;
    if (query) {
      data.query.queryString.setQuery(query);
    }

    const stopSyncingQueryAppStateWithStateContainer = connectToQueryState(
      data.query,
      appStateContainer,
      {
        filters: FilterStateStore.APP_STATE,
        query: true,
      }
    );

    // syncs `_g` portion of url with query services
    const { stop: stopSyncingGlobalStateWithUrl } = syncQueryStateWithUrl(data.query, stateStorage);

    // some filters may not be valid for this context, so update
    // the filter manager with a modified list of valid filters
    const currentFilters = filterManager.getFilters();
    const validFilters = getValidFilters(dataView!, currentFilters);
    if (!isEqual(currentFilters, validFilters)) {
      filterManager.setFilters(validFilters);
    }

    const { start, stop } = syncAppState();

    replaceUrlAppState({}).then(() => {
      start();
    });

    return () => {
      stopSyncingQueryAppStateWithStateContainer();
      stopSyncingGlobalStateWithUrl();
      stop();
    };
  };
  const dataStateContainer = getDataStateContainer({
    services,
    searchSessionManager,
    appStateContainer,
    savedSearch$,
  });

  return {
    appStateContainer: appStateContainerModified,
    dataStateContainer,
    savedSearchContainer,
    startSync: () => {
      const { start, stop } = syncAppState();
      start();
      return stop;
    },
    setAppState: (newPartial: AppState) => setState(appStateContainerModified, newPartial),
    replaceUrlAppState,
    resetInitialAppState: () => {
      initialAppState = appStateContainer.getState();
    },
    getPreviousAppState: () => previousAppState,
    flushToUrl: () => stateStorage.kbnUrlControls.flush(),
    isAppStateDirty: () => !isEqualState(initialAppState, appStateContainer.getState()),
    initializeAndSync,
    actions: {
      resetSavedSearch: async (id) => {
        const nextSavedSearch = await savedSearchContainer.reset(id);
        const newAppState = handleSourceColumnState(
          getStateDefaults({
            savedSearch: nextSavedSearch,
            services,
          }),
          services.uiSettings
        );
        await replaceUrlAppState(newAppState);
      },
      onOpenSavedSearch: (newSavedSearchId: string) => {
        if (savedSearch.id && savedSearch.id === newSavedSearchId) {
          savedSearchContainer.reset(savedSearch.id);
        } else {
          history.push(`/view/${encodeURIComponent(newSavedSearchId)}`);
        }
      },
      pauseAutoRefreshInterval,
      updateSavedQueryId: (newSavedQueryId: string | undefined) => {
        if (newSavedQueryId) {
          setState(appStateContainerModified, { savedQuery: newSavedQueryId });
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
      onUpdateQuery: (_, isUpdate?: boolean) => {
        if (isUpdate === false) {
          searchSessionManager.removeSearchSessionIdFromURL({ replace: false });
          dataStateContainer.refetch$.next(undefined);
        }
      },
      fetch: (reset?: boolean) => {
        const msg = reset ? 'reset' : undefined;
        dataStateContainer.refetch$.next(msg);
      },
      persistSavedSearch: (nextSavedSearch, { onError, onSuccess, saveOptions }) => {
        return savedSearchContainer.persist(nextSavedSearch, {
          onError,
          onSuccess,
          saveOptions,
          state: appStateContainer.getState(),
        });
      },
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
  };
}

function getDataStateContainer({
  services,
  searchSessionManager,
  appStateContainer,
  savedSearch$,
}: {
  services: DiscoverServices;
  searchSessionManager: DiscoverSearchSessionManager;
  appStateContainer: ReduxLikeStateContainer<AppState>;
  savedSearch$: BehaviorSubject<SavedSearch>;
}) {
  const { data } = services;
  const inspectorAdapters = { requests: new RequestAdapter() };
  const appState = appStateContainer.getState();
  const recordRawType = getRawRecordType(appState.query);
  /**
   * The observable to trigger data fetching in UI
   * By refetch$.next('reset') rows and fieldcounts are reset to allow e.g. editing of runtime fields
   * to be processed correctly
   */
  const refetch$ = new Subject<DataRefetchMsg>();
  const shouldSearchOnPageLoad =
    services.uiSettings.get<boolean>(SEARCH_ON_PAGE_LOAD_SETTING) ||
    savedSearch$.getValue().id !== undefined ||
    !services.timefilter.getRefreshInterval().pause ||
    searchSessionManager.hasSearchSessionIdInURL();
  const initialFetchStatus = shouldSearchOnPageLoad
    ? FetchStatus.LOADING
    : FetchStatus.UNINITIALIZED;

  /**
   * The observables the UI (aka React component) subscribes to get notified about
   * the changes in the data fetching process (high level: fetching started, data was received)
   */
  const initialState = { fetchStatus: initialFetchStatus, recordRawType };
  const dataSubjects: SavedSearchData = {
    main$: new BehaviorSubject<DataMainMsg>(initialState),
    documents$: new BehaviorSubject<DataDocumentsMsg>(initialState),
    totalHits$: new BehaviorSubject<DataTotalHitsMsg>(initialState),
    charts$: new BehaviorSubject<DataChartsMessage>(initialState),
    availableFields$: new BehaviorSubject<DataAvailableFieldsMsg>(initialState),
  };

  let autoRefreshDone: AutoRefreshDoneFn | undefined;
  /**
   * handler emitted by `timefilter.getAutoRefreshFetch$()`
   * to notify when data completed loading and to start a new autorefresh loop
   */
  const setAutoRefreshDone = (fn: AutoRefreshDoneFn | undefined) => {
    autoRefreshDone = fn;
  };
  const fetch$ = getFetch$({
    setAutoRefreshDone,
    data,
    main$: dataSubjects.main$,
    refetch$,
    searchSessionManager,
    initialFetchStatus,
  });
  let abortController: AbortController;

  function subscribe() {
    const subscription = fetch$.subscribe(async (val) => {
      if (
        !validateTimeRange(data.query.timefilter.timefilter.getTime(), services.toastNotifications)
      ) {
        return;
      }
      inspectorAdapters.requests.reset();

      abortController?.abort();
      abortController = new AbortController();
      const prevAutoRefreshDone = autoRefreshDone;

      await fetchAll(
        dataSubjects,
        savedSearch$.getValue(),
        val === 'reset',
        appStateContainer.getState(),
        {
          abortController,
          data,
          initialFetchStatus,
          inspectorAdapters,
          searchSessionId: searchSessionManager.getNextSearchSessionId(),
          services,
        }
      );

      // If the autoRefreshCallback is still the same as when we started i.e. there was no newer call
      // replacing this current one, call it to make sure we tell that the auto refresh is done
      // and a new one can be scheduled.
      if (autoRefreshDone === prevAutoRefreshDone) {
        // if this function was set and is executed, another refresh fetch can be triggered
        autoRefreshDone?.();
        autoRefreshDone = undefined;
      }
    });

    return () => {
      abortController?.abort();
      subscription.unsubscribe();
    };
  }

  const fetchQuery = (resetQuery?: boolean) => {
    if (resetQuery) {
      refetch$.next('reset');
    } else {
      refetch$.next(undefined);
    }
    return refetch$;
  };

  const reset = () => sendResetMsg(dataSubjects, initialFetchStatus);

  return {
    fetch: fetchQuery,
    data$: dataSubjects,
    refetch$,
    subscribe,
    reset,
    inspectorAdapters,
    initialFetchStatus,
  };
}
