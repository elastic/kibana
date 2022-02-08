/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isFunction, omitBy, union } from 'lodash';

import { migrateAppState } from './migrate_app_state';
import {
  createStateContainer,
  syncState,
  IKbnUrlStateStorage,
} from '../../../../kibana_utils/public';
import type { SavedVisState } from '../../types';
import type { VisualizeAppState, VisualizeAppStateTransitions } from '../types';

const STATE_STORAGE_KEY = '_a';

interface Arguments {
  kbnUrlStateStorage: IKbnUrlStateStorage;
  stateDefaults: VisualizeAppState;
  byValue?: boolean;
}

function toObject(state: SavedVisState): SavedVisState {
  return omitBy(state, (value, key: string) => {
    return key.charAt(0) === '$' || key.charAt(0) === '_' || isFunction(value);
  }) as SavedVisState;
}

const pureTransitions = {
  set: (state) => (prop, value) => ({ ...state, [prop]: value }),
  setVis: (state) => (vis) => ({
    ...state,
    vis: {
      ...state.vis,
      ...vis,
    },
  }),
  unlinkSavedSearch:
    (state) =>
    ({ query, parentFilters = [] }) => ({
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
} as VisualizeAppStateTransitions;

function createVisualizeByValueAppState(stateDefaults: VisualizeAppState) {
  const initialState = migrateAppState({
    ...stateDefaults,
  });
  const stateContainer = createStateContainer<VisualizeAppState, VisualizeAppStateTransitions>(
    initialState,
    pureTransitions
  );
  const stopStateSync = () => {};
  return { stateContainer, stopStateSync };
}

function createDefaultVisualizeAppState({ stateDefaults, kbnUrlStateStorage }: Arguments) {
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
    pureTransitions
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

export function createVisualizeAppState({ stateDefaults, kbnUrlStateStorage, byValue }: Arguments) {
  if (byValue) {
    return createVisualizeByValueAppState(stateDefaults);
  }
  return createDefaultVisualizeAppState({ stateDefaults, kbnUrlStateStorage });
}
