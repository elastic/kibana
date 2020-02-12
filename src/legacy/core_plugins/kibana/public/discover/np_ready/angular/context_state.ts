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
import {
  createStateContainer,
  createKbnUrlStateStorage,
  syncStates,
} from '../../../../../../../plugins/kibana_utils/public';
import { Filter } from '../../../../../../../plugins/data/common/es_query/filters';

interface AppState {
  columns: string[];
  filters: Filter[];
  predecessorCount: number;
  sort: string[];
  successorCount: number;
}

interface GlobalState {
  filters: Filter[];
}
const GLOBAL_STATE_URL_KEY = '_g';
const APP_STATE_URL_KEY = '_a';

/**
 * Builds and returns appState and globalState containers and helper functions
 * Used to sync URL with UI state
 */
export function getState(
  defaultStepSize: string,
  timeFieldName: string,
  storeInSessionStorage: boolean
) {
  const stateStorage = createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
  });

  const globalStateInitial = stateStorage.get(GLOBAL_STATE_URL_KEY) as GlobalState;
  const globalState = createStateContainer<GlobalState>(globalStateInitial);

  const appStateFromUrl = stateStorage.get(APP_STATE_URL_KEY) as AppState;
  const appStateInitial = createInitialAppState(defaultStepSize, timeFieldName, appStateFromUrl);
  const appState = createStateContainer<AppState>(appStateInitial);

  const { start, stop } = syncStates([
    {
      storageKey: GLOBAL_STATE_URL_KEY,
      stateContainer: globalState,
      stateStorage,
    },
    {
      storageKey: APP_STATE_URL_KEY,
      stateContainer: appState,
      stateStorage,
    },
  ]);

  return {
    globalState,
    appState,
    start,
    stop,
    getGlobalFilters: () => getFilters(globalState.getState()),
    getAppFilters: () => getFilters(appState.getState()),
  };
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

/**
 * Helper function to return the initial app state, which is a merged object of url state and
 * default state. The default size is the default number of successor/predecessor records to fetch
 */
function createInitialAppState(
  defaultSize: string,
  timeFieldName: string,
  urlState: AppState
): AppState {
  const defaultState = {
    columns: ['_source'],
    filters: [],
    predecessorCount: parseInt(defaultSize, 10),
    sort: [timeFieldName, 'desc'],
    successorCount: parseInt(defaultSize, 10),
  };
  if (typeof urlState !== 'object') {
    return defaultState;
  }

  return {
    ...defaultState,
    ...urlState,
  };
}
