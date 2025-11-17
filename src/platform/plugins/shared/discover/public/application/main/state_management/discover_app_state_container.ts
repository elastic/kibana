/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseStateContainer } from '@kbn/kibana-utils-plugin/common';
import type { AggregateQuery, Filter, FilterCompareOptions, Query } from '@kbn/es-query';
import {
  COMPARE_ALL_OPTIONS,
  compareFilters,
  FilterStateStore,
  isOfAggregateQueryType,
} from '@kbn/es-query';
import type { SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/public';
import type {
  IKbnUrlStateStorage,
  INullableBaseStateContainer,
} from '@kbn/kibana-utils-plugin/public';
import { syncState } from '@kbn/kibana-utils-plugin/public';
import { isEqual, omit } from 'lodash';
import { type GlobalQueryStateFromUrl, connectToQueryState } from '@kbn/data-plugin/public';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import type { DataGridDensity } from '@kbn/unified-data-table';
import type { DataView } from '@kbn/data-views-plugin/common';
import { distinctUntilChanged, from, map } from 'rxjs';
import { getESQLStatsQueryMeta } from '@kbn/esql-utils';
import defaultComparator from 'fast-deep-equal';
import type { DiscoverServices } from '../../../build_services';
import { addLog } from '../../../utils/add_log';
import { cleanupUrlState } from './utils/cleanup_url_state';
import { getStateDefaults } from './utils/get_state_defaults';
import { handleSourceColumnState } from '../../../utils/state_helpers';
import type { DiscoverDataSource } from '../../../../common/data_sources';
import {
  createDataViewDataSource,
  createEsqlDataSource,
  DataSourceType,
  isDataSourceType,
  isEsqlSource,
} from '../../../../common/data_sources';
import type { DiscoverSavedSearchContainer } from './discover_saved_search_container';
import type { DiscoverInternalState, InternalStateStore, TabActionInjector } from './redux';
import { internalStateActions, selectTab, useCurrentTabSelector } from './redux';
import { APP_STATE_URL_KEY } from '../../../../common';
import { GLOBAL_STATE_URL_KEY } from '../../../../common/constants';

export interface DiscoverAppStateContainer extends BaseStateContainer<DiscoverAppState> {
  /**
   * Initializes the app state and starts syncing it with the URL
   */
  initAndSync: () => () => void;
  /**
   * Updates the URL with the current app and global state without pushing to history (e.g. on initialization)
   */
  updateUrlWithCurrentState: () => Promise<void>;
  /**
   * Replaces the current state in URL with the given state
   * @param newState
   * @param merge if true, the given state is merged with the current state
   */
  replaceUrlState: (newPartial: DiscoverAppState, merge?: boolean) => Promise<void>;
  /**
   * Updates the state, if replace is true, a history.replace is performed instead of history.push
   * @param newPartial
   * @param replace
   */
  update: (newPartial: DiscoverAppState, replace?: boolean) => void;
  /*
   * Get updated AppState when given a saved search
   */
  getAppStateFromSavedSearch: (newSavedSearch: SavedSearch) => DiscoverAppState;
}

export interface DiscoverAppState {
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
   * The current data source
   */
  dataSource?: DiscoverDataSource;
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
   * Document explorer header row height option
   */
  headerRowHeight?: number;
  /**
   * Number of rows in the grid per page
   */
  rowsPerPage?: number;
  /**
   * Custom sample size
   */
  sampleSize?: number;
  /**
   * Breakdown field of chart
   */
  breakdownField?: string;
  /**
   * Density of table
   */
  density?: DataGridDensity;
}

export interface AppStateUrl extends Omit<DiscoverAppState, 'sort'> {
  /**
   * Necessary to take care of legacy links [fieldName,direction]
   */
  sort?: string[][] | [string, string];
  /**
   * Legacy data view ID prop
   */
  index?: string;
}

export const useAppStateSelector = <T>(selector: (state: DiscoverAppState) => T): T =>
  useCurrentTabSelector((tab) => selector(tab.appState), defaultComparator);

/**
 * This is the app state container for Discover main, it's responsible for syncing state with the URL
 * @param stateStorage
 * @param savedSearch
 * @param services
 */
export const getDiscoverAppStateContainer = ({
  tabId,
  stateStorage,
  internalState,
  savedSearchContainer,
  services,
  injectCurrentTab,
}: {
  tabId: string;
  stateStorage: IKbnUrlStateStorage;
  internalState: InternalStateStore;
  savedSearchContainer: DiscoverSavedSearchContainer;
  services: DiscoverServices;
  injectCurrentTab: TabActionInjector;
}): DiscoverAppStateContainer => {
  const getAppState = (state: DiscoverInternalState): DiscoverAppState => {
    return selectTab(state, tabId).appState;
  };

  const appStateContainer: INullableBaseStateContainer<DiscoverAppState> = {
    get: () => getAppState(internalState.getState()),
    set: (appState) => {
      if (!appState) {
        return;
      }

      if (
        isOfAggregateQueryType(appState.query) &&
        services.discoverFeatureFlags.getCascadeLayoutEnabled()
      ) {
        const currentTabState = selectTab(internalState.getState(), tabId);

        const availableCascadeGroups = getESQLStatsQueryMeta(
          (appState.query as AggregateQuery).esql
        ).groupByFields.map((group) => group.field);

        const computeSelectedCascadeGroups = (cascadeGroups: string[]) => {
          if (
            !currentTabState.uiState.cascadedDocuments ||
            (currentTabState.uiState.cascadedDocuments &&
              // if the proposed available groups is different in length or contains a value the existing one doesn't have, we want to reset by defaulting to the first group
              (cascadeGroups.length !==
                currentTabState.uiState.cascadedDocuments.availableCascadeGroups.length ||
                cascadeGroups.some(
                  (group) =>
                    (
                      currentTabState.uiState.cascadedDocuments?.availableCascadeGroups ?? []
                    ).indexOf(group) < 0
                )))
          ) {
            return [cascadeGroups[0]].filter(Boolean);
          }

          // return existing selection since we've asserted that there's been no change to the available groups default
          return currentTabState.uiState.cascadedDocuments!.selectedCascadeGroups;
        };

        // compute and set cascade groupings when state updates happen
        internalState.dispatch(
          injectCurrentTab(internalStateActions.setCascadeUiState)({
            cascadeUiState: {
              availableCascadeGroups,
              selectedCascadeGroups: computeSelectedCascadeGroups(availableCascadeGroups),
            },
          })
        );
      }

      internalState.dispatch(injectCurrentTab(internalStateActions.setAppState)({ appState }));
    },
    state$: from(internalState).pipe(map(getAppState), distinctUntilChanged(isEqual)),
  };

  const getAppStateFromSavedSearch = (newSavedSearch: SavedSearch) => {
    return getInitialState({
      initialUrlState: undefined,
      savedSearch: newSavedSearch,
      services,
    });
  };

  const replaceUrlState = async (newPartial: DiscoverAppState = {}, merge = true) => {
    addLog('[appState] replaceUrlState', { newPartial, merge });
    const state = merge ? { ...appStateContainer.get(), ...newPartial } : newPartial;
    if (internalState.getState().tabs.unsafeCurrentId === tabId) {
      await stateStorage.set(APP_STATE_URL_KEY, state, { replace: true });
    } else {
      appStateContainer.set(state);
    }
  };

  const getGlobalState = (state: DiscoverInternalState): GlobalQueryStateFromUrl => {
    const tabState = selectTab(state, tabId);
    const { timeRange: time, refreshInterval, filters } = tabState.globalState;

    return { time, refreshInterval, filters };
  };

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
    state$: from(internalState).pipe(map(getGlobalState), distinctUntilChanged(isEqual)),
  };

  const updateUrlWithCurrentState = async () => {
    await Promise.all([
      stateStorage.set(GLOBAL_STATE_URL_KEY, globalStateContainer.get(), { replace: true }),
      replaceUrlState({}),
    ]);
  };

  const initAndSync = () => {
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
    const savedSearchDataView = currentSavedSearch.searchSource.getField('index');
    const appState = appStateContainer.get();
    const setDataViewFromSavedSearch =
      !appState.dataSource ||
      (isDataSourceType(appState.dataSource, DataSourceType.DataView) &&
        appState.dataSource.dataViewId !== savedSearchDataView?.id);

    if (setDataViewFromSavedSearch) {
      // used data view is different from the given by url/state which is invalid
      setState(appStateContainer, {
        dataSource: savedSearchDataView?.id
          ? createDataViewDataSource({ dataViewId: savedSearchDataView.id })
          : undefined,
      });
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

    const { start: startSyncingGlobalStateWithUrl, stop: stopSyncingGlobalStateWithUrl } =
      syncState({
        storageKey: GLOBAL_STATE_URL_KEY,
        stateContainer: globalStateContainer,
        stateStorage,
      });

    // current state needs to be pushed to url
    updateUrlWithCurrentState().then(() => {
      startSyncingAppStateWithUrl();
      startSyncingGlobalStateWithUrl();
    });

    return () => {
      stopSyncingQueryAppStateWithStateContainer();
      stopSyncingQueryGlobalStateWithStateContainer();
      stopSyncingAppStateWithUrl();
      stopSyncingGlobalStateWithUrl();
    };
  };

  const update = (newPartial: DiscoverAppState, replace = false) => {
    addLog('[appState] update', { newPartial, replace });
    if (replace) {
      return replaceUrlState(newPartial);
    } else {
      setState(appStateContainer, newPartial);
    }
  };

  return {
    ...appStateContainer,
    initAndSync,
    updateUrlWithCurrentState,
    replaceUrlState,
    update,
    getAppStateFromSavedSearch,
  };
};

export function getCurrentUrlState(stateStorage: IKbnUrlStateStorage, services: DiscoverServices) {
  return (
    cleanupUrlState(stateStorage.get<AppStateUrl>(APP_STATE_URL_KEY) ?? {}, services.uiSettings) ??
    {}
  );
}

export function getInitialState({
  initialUrlState,
  savedSearch,
  overrideDataView,
  services,
}: {
  initialUrlState: DiscoverAppState | undefined;
  savedSearch: SavedSearch | undefined;
  overrideDataView?: DataView | undefined;
  services: DiscoverServices;
}) {
  const defaultAppState = getStateDefaults({
    savedSearch,
    overrideDataView,
    services,
  });
  const mergedState = { ...defaultAppState, ...initialUrlState };

  // https://github.com/elastic/kibana/issues/122555
  if (typeof mergedState.hideChart !== 'boolean') {
    mergedState.hideChart = undefined;
  }

  // Don't allow URL state to overwrite the data source if there's an ES|QL query
  if (isOfAggregateQueryType(mergedState.query) && !isEsqlSource(mergedState.dataSource)) {
    mergedState.dataSource = createEsqlDataSource();
  }

  return handleSourceColumnState(mergedState, services.uiSettings);
}

/**
 * Helper function to merge a given new state with the existing state and to set the given state
 * container
 */
export function setState(
  stateContainer: BaseStateContainer<DiscoverAppState>,
  newState: DiscoverAppState
) {
  addLog('[appstate] setState', { newState });
  const oldState = stateContainer.get();
  const mergedState = { ...oldState, ...newState };
  if (!isEqualState(oldState, mergedState)) {
    stateContainer.set(mergedState);
  }
}

/**
 * Helper function to compare 2 different filter states
 */
export function isEqualFilters(
  filtersA?: Filter[] | Filter,
  filtersB?: Filter[] | Filter,
  comparatorOptions: FilterCompareOptions = COMPARE_ALL_OPTIONS
) {
  if (!filtersA && !filtersB) {
    return true;
  } else if (!filtersA || !filtersB) {
    return false;
  }
  return compareFilters(filtersA, filtersB, comparatorOptions);
}

/**
 * Helper function to compare 2 different state, is needed since comparing filters
 * works differently
 */
export function isEqualState(
  stateA: DiscoverAppState,
  stateB: DiscoverAppState,
  exclude: Array<keyof DiscoverAppState> = []
) {
  if (!stateA && !stateB) {
    return true;
  } else if (!stateA || !stateB) {
    return false;
  }

  const { filters: stateAFilters = [], ...stateAPartial } = omit(stateA, exclude as string[]);
  const { filters: stateBFilters = [], ...stateBPartial } = omit(stateB, exclude as string[]);

  return isEqual(stateAPartial, stateBPartial) && isEqualFilters(stateAFilters, stateBFilters);
}
