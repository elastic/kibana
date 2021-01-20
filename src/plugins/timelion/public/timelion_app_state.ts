/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createStateContainer, syncState, IKbnUrlStateStorage } from '../../kibana_utils/public';

import { TimelionAppState, TimelionAppStateTransitions } from './types';

const STATE_STORAGE_KEY = '_a';

interface Arguments {
  kbnUrlStateStorage: IKbnUrlStateStorage;
  stateDefaults: TimelionAppState;
}

export function initTimelionAppState({ stateDefaults, kbnUrlStateStorage }: Arguments) {
  const urlState = kbnUrlStateStorage.get<TimelionAppState>(STATE_STORAGE_KEY);
  const initialState = {
    ...stateDefaults,
    ...urlState,
  };

  /*
    make sure url ('_a') matches initial state
    Initializing appState does two things - first it translates the defaults into AppState,
    second it updates appState based on the url (the url trumps the defaults). This means if
    we update the state format at all and want to handle BWC, we must not only migrate the
    data stored with saved vis, but also any old state in the url.
  */
  kbnUrlStateStorage.set(STATE_STORAGE_KEY, initialState, { replace: true });

  const stateContainer = createStateContainer<TimelionAppState, TimelionAppStateTransitions>(
    initialState,
    {
      set: (state) => (prop, value) => ({ ...state, [prop]: value }),
      updateState: (state) => (newValues) => ({ ...state, ...newValues }),
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
