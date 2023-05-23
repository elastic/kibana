/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ActionId, CommitFn, State, Store, UpdaterFunction } from '.';

let counter = 0 as ActionId;

export const createStore = (initialState: State, updater: UpdaterFunction): Store => {
  let currentState = initialState;

  const commit: CommitFn = (type, payload) => {
    return (currentState = updater({
      ...currentState,
      primaryUpdate: {
        type,
        payload: { ...payload, uid: counter++ },
      },
    }));
  };

  const getCurrentState = () => currentState;

  const setCurrentState = (state: State) => {
    currentState = state;
    commit('flush', {});
  };

  return { getCurrentState, setCurrentState, commit };
};
