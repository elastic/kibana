/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import _ from 'lodash';
import { createHashHistory } from 'history';
import {
  createStateContainer,
  createKbnUrlStateStorage,
  syncStates,
} from '../../../../../../../plugins/kibana_utils/public';
import { esFilters, Filter } from '../../../../../../../plugins/data/public';

interface AppState {
  columns?: string[];
  filters?: Filter[];
  index?: string;
  interval?: string;
  query?: any;
  sort?: string[];
}

interface GlobalState {
  filters?: Filter[];
  time?: { from: string; to: string };
}

/**
 * Builds and returns appState and globalState containers and helper functions
 * Used to sync URL with UI state
 */
export function getState(
  defaultAppState: AppState,
  storeInSessionStorage: boolean,
  onChangeAppStatus: (dirty: boolean) => void
) {
  const stateStorage = createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history: createHashHistory(),
  });

  const globalStateInitial = stateStorage.get('_g') as GlobalState;
  const globalStateContainer = createStateContainer<GlobalState>(globalStateInitial);

  const appStateFromUrl = stateStorage.get('_a') as AppState;
  let initialAppState = {
    ...defaultAppState,
    ...appStateFromUrl,
  };

  // make sure url ('_a') matches initial state
  if (!_.isEqual(initialAppState, appStateFromUrl)) {
    stateStorage.set('_a', initialAppState, { replace: true });
  }

  const appStateContainer = createStateContainer<AppState>(initialAppState);

  const { start, stop } = syncStates([
    {
      storageKey: '_a',
      stateContainer: appStateContainer,
      stateStorage,
    },
    {
      storageKey: '_g',
      stateContainer: globalStateContainer,
      stateStorage,
    },
  ]);

  return {
    globalStateContainer,
    appStateContainer,
    start,
    stop,
    syncGlobalState: (newPartial: GlobalState) => {
      const oldState = globalStateContainer.getState();
      const newState = { ...oldState, ...newPartial };
      if (!isEqualState(oldState, newState)) {
        globalStateContainer.set(newState);
      }
    },
    syncAppState: (newPartial: AppState) => {
      const oldState = appStateContainer.getState();
      const newState = { ...oldState, ...newPartial };
      if (!isEqualState(oldState, newState)) {
        appStateContainer.set(newState);
      }
      if (!isEqualState(initialAppState, newState)) {
        onChangeAppStatus(true);
      }
    },
    getGlobalFilters: () => getFilters(globalStateContainer.getState()),
    getAppFilters: () => getFilters(appStateContainer.getState()),
    setInitialAppState: (newState: AppState) => {
      initialAppState = newState;
    },
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

export function splitState(state: AppState | GlobalState = {}) {
  const { filters = [], ...statePartial } = state;
  return { filters, state: statePartial };
}

/**
 * Helper function to compare 2 different state, is needed since comparing filters
 * works differently
 */
export function isEqualState(stateA: AppState | GlobalState, stateB: AppState | GlobalState) {
  if (!stateA && !stateB) {
    return true;
  } else if (!stateA || !stateB) {
    return false;
  }
  const { filters: stateAFilters = [], ...stateAPartial } = stateA;
  const { filters: stateBFilters = [], ...stateBPartial } = stateB;
  return _.isEqual(stateAPartial, stateBPartial) && isEqualFilters(stateAFilters, stateBFilters);
}

/**
 * Helper function to return array of filter object of a given state
 */
const getFilters = (state: AppState | GlobalState): Filter[] => {
  if (!state || !Array.isArray(state.filters)) {
    return [];
  }
  return state.filters;
};
