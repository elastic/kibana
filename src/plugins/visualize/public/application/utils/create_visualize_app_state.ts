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

import { isFunction, omitBy, union } from 'lodash';

import { migrateAppState } from './migrate_app_state';
import {
  createStateContainer,
  syncState,
  IKbnUrlStateStorage,
} from '../../../../kibana_utils/public';
import { PureVisState, VisualizeAppState, VisualizeAppStateTransitions } from '../types';

const STATE_STORAGE_KEY = '_a';

interface Arguments {
  kbnUrlStateStorage: IKbnUrlStateStorage;
  stateDefaults: VisualizeAppState;
}

function toObject(state: PureVisState): PureVisState {
  return omitBy(state, (value, key: string) => {
    return key.charAt(0) === '$' || key.charAt(0) === '_' || isFunction(value);
  }) as PureVisState;
}

export function createVisualizeAppState({ stateDefaults, kbnUrlStateStorage }: Arguments) {
  const urlState = kbnUrlStateStorage.get<VisualizeAppState>(STATE_STORAGE_KEY);
  const initialState = migrateAppState({
    ...stateDefaults,
    ...urlState,
  });

  /*
    make sure url ('_a') matches initial state
    Initializing appState does two things - first it translates the defaults into AppState,
    second it updates appState based on the url (the url trumps the defaults). This means if
    we update the state format at all and want to handle BWC, we must not only migrate the
    data stored with saved vis, but also any old state in the url.
  */
  kbnUrlStateStorage.set(STATE_STORAGE_KEY, initialState, { replace: true });

  const stateContainer = createStateContainer<VisualizeAppState, VisualizeAppStateTransitions>(
    initialState,
    {
      set: (state) => (prop, value) => ({ ...state, [prop]: value }),
      setVis: (state) => (vis) => ({
        ...state,
        vis: {
          ...state.vis,
          ...vis,
        },
      }),
      unlinkSavedSearch: (state) => ({ query, parentFilters = [] }) => ({
        ...state,
        query: query || state.query,
        filters: union(state.filters, parentFilters),
        linked: false,
      }),
      updateVisState: (state) => (newVisState) => ({ ...state, vis: toObject(newVisState) }),
      updateSavedQuery: (state) => (savedQueryId) => {
        const updatedState = {
          ...state,
          savedQuery: savedQueryId,
        };

        if (!savedQueryId) {
          delete updatedState.savedQuery;
        }

        return updatedState;
      },
    }
  );

  const { start: startStateSync, stop: stopStateSync } = syncState({
    storageKey: STATE_STORAGE_KEY,
    stateContainer: {
      ...stateContainer,
      set: (state) => {
        if (state) {
          // syncState utils requires to handle incoming "null" value
          stateContainer.set(state);
        }
      },
    },
    stateStorage: kbnUrlStateStorage,
  });

  // start syncing the appState with the ('_a') url
  startStateSync();

  return { stateContainer, stopStateSync };
}
