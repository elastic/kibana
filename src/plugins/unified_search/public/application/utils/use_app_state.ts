/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createHashHistory } from 'history';
import { useEffect, useMemo, useState } from 'react';
import { NotificationsStart } from 'kibana/public';
import { cloneDeep, isEqual } from 'lodash';
import {
  createStateContainer,
  createKbnUrlStateStorage,
  syncStates,
  withNotifyOnErrors,
  ReduxLikeStateContainer,
} from '../../../../kibana_utils/public';

import { esFilters, FilterManager, Filter } from '../../../../data/public';

import type { UnifiedSearchServices, UnifiedSearchAppState } from '../types';

const GLOBAL_STATE_URL_KEY = '_g';
const APP_STATE_URL_KEY = '_a';

interface GlobalState {
  /**
   * Array of filters
   */
  filters: Filter[];
}
interface GetStateParams {
  /**
   * Determins the use of long vs. short/hashed urls
   */
  storeInSessionStorage?: boolean;
  /**
   * Core's notifications.toasts service
   * In case it is passed in,
   * kbnUrlStateStorage will use it notifying about inner errors
   */
  toasts?: NotificationsStart['toasts'];
}

interface GetStateReturn {
  /**
   * Global state, the _g part of the URL
   */
  globalState: ReduxLikeStateContainer<GlobalState>;
  /**
   * App state, the _a part of the URL
   */
  appState: ReduxLikeStateContainer<UnifiedSearchAppState>;
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
  setAppState: (newState: Partial<UnifiedSearchAppState>) => void;
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
/**
 * Builds and returns appState and globalState containers
 * provides helper functions to start/stop syncing with URL
 */
export function getState({
  storeInSessionStorage = false,
  toasts,
}: GetStateParams): GetStateReturn {
  const history = createHashHistory();

  const stateStorage = createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history,
    ...(toasts && withNotifyOnErrors(toasts)),
  });

  const globalStateInitial = stateStorage.get(GLOBAL_STATE_URL_KEY) as GlobalState;
  const globalStateContainer = createStateContainer<GlobalState>(globalStateInitial);

  const appStateFromUrl = stateStorage.get(APP_STATE_URL_KEY) as UnifiedSearchAppState;
  const appStateInitial = appStateFromUrl;
  const appStateContainer = createStateContainer<UnifiedSearchAppState>(appStateInitial);

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
          set: (value: UnifiedSearchAppState | null) => {
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
    setAppState: (newState: Partial<UnifiedSearchAppState>) => {
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

export function useContextAppState({ services }: { services: UnifiedSearchServices }) {
  const { uiSettings, notifications, data } = services;

  const stateContainer = useMemo(() => {
    return getState({
      storeInSessionStorage: uiSettings.get('state:storeInSessionStorage'),
      toasts: notifications.toasts,
    });
  }, [uiSettings, notifications.toasts]);

  const [appState, setState] = useState<UnifiedSearchAppState>(stateContainer.appState.getState());

  /**
   * Sync with app state container
   */
  useEffect(() => {
    stateContainer.startSync();

    return () => stateContainer.stopSync();
  }, [stateContainer]);

  useEffect(() => {
    const unsubscribeAppState = stateContainer.appState.subscribe((newState) => {
      setState((prevState) => ({ ...prevState, ...newState }));
    });

    return () => unsubscribeAppState();
  }, [stateContainer, setState]);

  /**
   * Update filters
   */
  useEffect(() => {
    const filters = stateContainer?.appState?.getState()?.filters;
    if (filters) {
      data.query.filterManager.setAppFilters(cloneDeep(filters));
    }

    const { setFilters } = stateContainer;
    const filterObservable = data.query.filterManager.getUpdates$().subscribe(() => {
      setFilters(data.query.filterManager);
    });

    return () => filterObservable.unsubscribe();
  }, [data.query.filterManager, stateContainer]);

  return {
    appState,
    stateContainer,
    setAppState: stateContainer.setAppState,
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
  return esFilters.compareFilters(filtersA, filtersB, esFilters.COMPARE_ALL_OPTIONS);
}

/**
 * Helper function to compare 2 different states, is needed since comparing filters
 * works differently, doesn't work with _.isEqual
 */
function isEqualState(
  stateA: UnifiedSearchAppState | GlobalState,
  stateB: UnifiedSearchAppState | GlobalState
) {
  if (!stateA && !stateB) {
    return true;
  } else if (!stateA || !stateB) {
    return false;
  }
  const { filters: stateAFilters = [], ...stateAPartial } = stateA;
  const { filters: stateBFilters = [], ...stateBPartial } = stateB;
  return (
    isEqual(stateAPartial, stateBPartial) &&
    esFilters.compareFilters(stateAFilters, stateBFilters, esFilters.COMPARE_ALL_OPTIONS)
  );
}

/**
 * Helper function to return array of filter object of a given state
 */
function getFilters(state: UnifiedSearchAppState | GlobalState): Filter[] {
  if (!state || !Array.isArray(state.filters)) {
    return [];
  }
  return state.filters;
}
