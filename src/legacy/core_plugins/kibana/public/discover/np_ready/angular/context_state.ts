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
import { createStateContainer } from '../../../../../../../plugins/kibana_utils/public';
import { createKbnUrlStateStorage } from '../../../../../../../plugins/kibana_utils/public';
import { syncStates } from '../../../../../../../plugins/kibana_utils/public';

interface AppState {
  columns: string[];
  filters: any[];
  predecessorCount: string;
  sort: [string, string];
  successorCount: string;
}

interface GlobalState {
  filters: any[];
}

export function getState(defaultStepSize: string, timeFieldName: string) {
  const stateStorage = createKbnUrlStateStorage();
  const globalStateFromUrl = stateStorage.get('_g') as GlobalState;
  const globalState = createStateContainer(globalStateFromUrl) as any;

  const appStateFromUrl = stateStorage.get('_a') as AppState;
  const appStateDefault = createDefaultAppState(defaultStepSize, timeFieldName);
  const appStateInitial = {
    ...appStateDefault,
    ...appStateFromUrl,
  } as AppState;

  const appState = createStateContainer(appStateInitial) as any;

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

  const getGlobalFilters = () => {
    const state = globalState.getState();
    if (!state || !Array.isArray(state.filters)) {
      return [];
    }
    return state.filters;
  };
  const getAppFilters = () => {
    const state = appState.getState();
    if (!state || !Array.isArray(state.filters)) {
      return [];
    }
    return state.filters;
  };

  return {
    globalState,
    appState,
    start,
    stop,
    getGlobalFilters,
    getAppFilters,
    getFilters: () => {
      return _.cloneDeep([...getGlobalFilters(), ...getAppFilters()]);
    },
  };
}

function createDefaultAppState(defaultSize: string, timeFieldName: string) {
  return {
    columns: ['_source'],
    filters: [],
    predecessorCount: parseInt(defaultSize, 10),
    sort: [timeFieldName, 'desc'],
    successorCount: parseInt(defaultSize, 10),
  };
}
