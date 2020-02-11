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
  predecessorCount: string;
  sort: string[];
  successorCount: string;
}

interface GlobalState {
  filters: Filter[];
}

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

  const globalStateInitial = stateStorage.get('_g') as GlobalState;
  const globalState = createStateContainer<GlobalState>(globalStateInitial);

  const appStateFromUrl = stateStorage.get('_a') as AppState;
  const appStateInitial = createInitialAppState(defaultStepSize, timeFieldName, appStateFromUrl);
  const appState = createStateContainer<AppState>(appStateInitial);

  const { start, stop } = syncStates([
    {
      storageKey: '_a',
      stateContainer: appState,
      stateStorage,
    },
    {
      storageKey: '_g',
      stateContainer: globalState,
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
    predecessorCount: defaultSize,
    sort: [timeFieldName, 'desc'],
    successorCount: defaultSize,
  };
  if (typeof urlState !== 'object') {
    return defaultState;
  }

  return {
    ...defaultState,
    ...urlState,
  };
}
