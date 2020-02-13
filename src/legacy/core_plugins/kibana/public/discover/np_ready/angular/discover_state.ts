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
import { Filter } from '../../../../../../../plugins/data/common/es_query/filters';

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
      if (!_.isEqual(oldState, newState)) {
        globalStateContainer.set(newState);
      }
    },
    syncAppState: (newPartial: AppState) => {
      const oldState = appStateContainer.getState();
      const newState = { ...oldState, ...newPartial };
      if (!_.isEqual(oldState, newState)) {
        appStateContainer.set(newState);
      }
      if (!_.isEqual(initialAppState, newState)) {
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
 * Helper function to return array of filter object of a given state
 */
const getFilters = (state: AppState | GlobalState): Filter[] => {
  if (!state || !Array.isArray(state.filters)) {
    return [];
  }
  return state.filters;
};
