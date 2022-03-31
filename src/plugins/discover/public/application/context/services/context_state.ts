/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import { History } from 'history';
import { NotificationsStart, IUiSettingsClient } from 'kibana/public';
import { Filter, compareFilters, COMPARE_ALL_OPTIONS } from '@kbn/es-query';
import {
  createStateContainer,
  createKbnUrlStateStorage,
  syncStates,
  withNotifyOnErrors,
  ReduxLikeStateContainer,
} from '../../../../../kibana_utils/public';

import { FilterManager } from '../../../../../data/public';
import { handleSourceColumnState } from '../../../utils/state_helpers';

export interface AppState {
  /**
   * Columns displayed in the table, cannot be changed by UI, just in discover's main app
   */
  columns: string[];
  /**
   * Array of filters
   */
  filters: Filter[];
  /**
   * Number of records to be fetched before anchor records (newer records)
   */
  predecessorCount: number;
  /**
   * Number of records to be fetched after the anchor records (older records)
   */
  successorCount: number;
  /**
   * Array of the used sorting [[field,direction],...]
   * this is actually not needed in Discover Context, there's no sorting
   * but it's used in the DocTable component
   */
  sort?: string[][];
  samplingProbability?: number;
}

interface GlobalState {
  /**
   * Array of filters
   */
  filters: Filter[];
}

export interface GetStateParams {
  /**
   * Number of records to be fetched when 'Load' link/button is clicked
   */
  defaultSize: number;
  /**
   * Determins the use of long vs. short/hashed urls
   */
  storeInSessionStorage?: boolean;
  /**
   * History instance to use
   */
  history: History;

  /**
   * Core's notifications.toasts service
   * In case it is passed in,
   * kbnUrlStateStorage will use it notifying about inner errors
   */
  toasts?: NotificationsStart['toasts'];

  /**
   * core ui settings service
   */
  uiSettings: IUiSettingsClient;
}

export interface GetStateReturn {
  /**
   * Global state, the _g part of the URL
   */
  globalState: ReduxLikeStateContainer<GlobalState>;
  /**
   * App state, the _a part of the URL
   */
  appState: ReduxLikeStateContainer<AppState>;
  /**
   * Start sync between state and URL
   */
  startSync: () => void;
  /**
   * Stop sync between state and URL
   */
  stopSync: () => void;
  /**
   * Set app state to with a partial new app state
   */
  setAppState: (newState: Partial<AppState>) => void;
  /**
   * Get all filters, global and app state
   */
  getFilters: () => Filter[];
  /**
   * Set global state and app state filters by the given FilterManager instance
   * @param filterManager
   */
  setFilters: (filterManager: FilterManager) => void;
  /**
   * sync state to URL, used for testing
   */
  flushToUrl: (replace?: boolean) => void;
}
const GLOBAL_STATE_URL_KEY = '_g';
const APP_STATE_URL_KEY = '_a';

/**
 * Builds and returns appState and globalState containers
 * provides helper functions to start/stop syncing with URL
 */
export function getState({
  defaultSize,
  storeInSessionStorage = false,
  history,
  toasts,
  uiSettings,
}: GetStateParams): GetStateReturn {
  const stateStorage = createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history,
    ...(toasts && withNotifyOnErrors(toasts)),
  });

  const globalStateInitial = stateStorage.get(GLOBAL_STATE_URL_KEY) as GlobalState;
  const globalStateContainer = createStateContainer<GlobalState>(globalStateInitial);

  const appStateFromUrl = stateStorage.get(APP_STATE_URL_KEY) as AppState;
  const appStateInitial = createInitialAppState(defaultSize, appStateFromUrl, uiSettings);
  const appStateContainer = createStateContainer<AppState>(appStateInitial);

  const { start, stop } = syncStates([
    {
      storageKey: GLOBAL_STATE_URL_KEY,
      stateContainer: {
        ...globalStateContainer,
        ...{
          set: (value: GlobalState | null) => {
            if (value) {
              globalStateContainer.set(value);
            }
          },
        },
      },
      stateStorage,
    },
    {
      storageKey: APP_STATE_URL_KEY,
      stateContainer: {
        ...appStateContainer,
        ...{
          set: (value: AppState | null) => {
            if (value) {
              appStateContainer.set(value);
            }
          },
        },
      },
      stateStorage,
    },
  ]);

  return {
    globalState: globalStateContainer,
    appState: appStateContainer,
    startSync: start,
    stopSync: stop,
    setAppState: (newState: Partial<AppState>) => {
      const oldState = appStateContainer.getState();
      const mergedState = { ...oldState, ...newState };

      if (!isEqualState(oldState, mergedState)) {
        stateStorage.set(APP_STATE_URL_KEY, mergedState, { replace: true });
      }
    },
    getFilters: () => [
      ...getFilters(globalStateContainer.getState()),
      ...getFilters(appStateContainer.getState()),
    ],
    setFilters: (filterManager: FilterManager) => {
      // global state filters
      const globalFilters = filterManager.getGlobalFilters();
      const globalFilterChanged = !isEqualFilters(
        globalFilters,
        getFilters(globalStateContainer.getState())
      );
      if (globalFilterChanged) {
        globalStateContainer.set({ filters: globalFilters });
      }
      // app state filters
      const appFilters = filterManager.getAppFilters();
      const appFilterChanged = !isEqualFilters(
        appFilters,
        getFilters(appStateContainer.getState())
      );
      if (appFilterChanged) {
        appStateContainer.set({ ...appStateContainer.getState(), ...{ filters: appFilters } });
      }
    },
    // helper function just needed for testing
    flushToUrl: (replace?: boolean) => stateStorage.kbnUrlControls.flush(replace),
  };
}

/**
 * Helper function to compare 2 different filter states
 */
export function isEqualFilters(filtersA: Filter[], filtersB: Filter[]) {
  if (!filtersA && !filtersB) {
    return true;
  } else if (!filtersA || !filtersB) {
    return false;
  }
  return compareFilters(filtersA, filtersB, COMPARE_ALL_OPTIONS);
}

/**
 * Helper function to compare 2 different states, is needed since comparing filters
 * works differently, doesn't work with _.isEqual
 */
function isEqualState(stateA: AppState | GlobalState, stateB: AppState | GlobalState) {
  if (!stateA && !stateB) {
    return true;
  } else if (!stateA || !stateB) {
    return false;
  }
  const { filters: stateAFilters = [], ...stateAPartial } = stateA;
  const { filters: stateBFilters = [], ...stateBPartial } = stateB;
  return (
    isEqual(stateAPartial, stateBPartial) &&
    compareFilters(stateAFilters, stateBFilters, COMPARE_ALL_OPTIONS)
  );
}

/**
 * Helper function to return array of filter object of a given state
 */
function getFilters(state: AppState | GlobalState): Filter[] {
  if (!state || !Array.isArray(state.filters)) {
    return [];
  }
  return state.filters;
}

/**
 * Helper function to return the initial app state, which is a merged object of url state and
 * default state. The default size is the default number of successor/predecessor records to fetch
 */
function createInitialAppState(
  defaultSize: number,
  urlState: AppState,
  uiSettings: IUiSettingsClient
): AppState {
  const defaultState: AppState = {
    columns: ['_source'],
    filters: [],
    predecessorCount: defaultSize,
    successorCount: defaultSize,
  };
  if (typeof urlState !== 'object') {
    return defaultState;
  }

  return handleSourceColumnState(
    {
      ...defaultState,
      ...urlState,
    },
    uiSettings
  );
}
