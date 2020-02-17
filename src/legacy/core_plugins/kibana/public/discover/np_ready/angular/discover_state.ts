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
  ReduxLikeStateContainer,
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

interface GetStateArgs {
  defaultAppState?: AppState;
  storeInSessionStorage?: boolean;
  onChangeAppStatus?: (dirty: boolean) => void;
  hashHistory?: any;
}

/**
 * Builds and returns appState and globalState containers and helper functions
 * Used to sync URL with UI state
 */
export async function getState({
  defaultAppState = {},
  storeInSessionStorage = false,
  hashHistory,
}: GetStateArgs) {
  const stateStorage = createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history: hashHistory ? hashHistory : createHashHistory(),
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
    await stateStorage.set('_a', initialAppState, { replace: true });
  }

  const appStateContainer = createStateContainer<AppState>(initialAppState);

  const { start, stop } = syncStates([
    {
      storageKey: '_a',
      stateContainer: {
        ...appStateContainer,
        // handle null value when url switch doesn't contain state info
        ...{ set: value => value && appStateContainer.set(value) },
      },
      stateStorage,
    },
    {
      storageKey: '_g',
      stateContainer: {
        ...globalStateContainer,
        // handle null value when url switch doesn't contain state info
        ...{ set: value => value && globalStateContainer.set(value) },
      },
      stateStorage,
    },
  ]);

  return {
    globalStateContainer,
    appStateContainer,
    start,
    stop,
    syncGlobalState: (newPartial: GlobalState) => setState(globalStateContainer, newPartial),
    syncAppState: (newPartial: AppState) => setState(appStateContainer, newPartial),
    getGlobalFilters: () => getFilters(globalStateContainer.getState()),
    getAppFilters: () => getFilters(appStateContainer.getState()),
    resetInitialAppState: () => {
      initialAppState = appStateContainer.getState();
    },
    flush: () => stateStorage.flush(),
    isAppStateDirty: () => !isEqualState(initialAppState, appStateContainer.getState()),
  };
}

/**
 * Helper function to merge a given new state with the existing state and to set the given state
 * container
 */
export function setState(
  stateContainer: ReduxLikeStateContainer<AppState | GlobalState>,
  newState: AppState | GlobalState
) {
  const oldState = stateContainer.getState();
  const mergedState = { ...oldState, ...newState };
  if (!isEqualState(oldState, mergedState)) {
    stateContainer.set(newState);
  }
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
 * helper function to extract filters of the given state
 * returns a state object without filters and an array of filters
 */

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
