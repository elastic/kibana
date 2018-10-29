/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { loadUserConfig, loadUserConfigFailed, loadUserConfigSuccess } from '../actions';

export interface UserConfigState {
  isAdmin: boolean;
  error?: Error;
}

const initialState: UserConfigState = {
  isAdmin: false,
};

export const userConfig = handleActions(
  {
    [String(loadUserConfig)]: (state: UserConfigState, action: Action<any>) =>
      produce<UserConfigState>(state, draft => {
        draft.error = undefined;
      }),
    [String(loadUserConfigSuccess)]: (state: UserConfigState, action: Action<any>) =>
      produce<UserConfigState>(state, draft => {
        draft.isAdmin = action.payload!.isAdmin;
      }),
    [String(loadUserConfigFailed)]: (state: UserConfigState, action: Action<any>) => {
      if (action.payload) {
        return produce<UserConfigState>(state, draft => {
          draft.error = action.payload;
        });
      } else {
        return state;
      }
    },
  },
  initialState
);
