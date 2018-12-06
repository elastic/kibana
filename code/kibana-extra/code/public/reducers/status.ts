/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { handleActions } from 'redux-actions';
import { loadStatus, loadStatusFailed, loadStatusSuccess } from '../actions/status';

export interface StatusState {
  status: { [key: string]: any };
  loading: boolean;
  error?: Error;
}

const initialState: StatusState = {
  status: {},
  loading: false,
};

export const status = handleActions(
  {
    [String(loadStatus)]: (state: StatusState, action: any) =>
      produce<StatusState>(state, draft => {
        draft.loading = true;
      }),
    [String(loadStatusSuccess)]: (state: StatusState, action: any) =>
      produce<StatusState>(state, draft => {
        draft.status[action.payload.repoUri] = action.payload.status;
        draft.loading = false;
      }),
    [String(loadStatusFailed)]: (state: StatusState, action: any) =>
      produce<StatusState>(state, draft => {
        draft.loading = false;
        draft.error = action.payload;
      }),
  },
  initialState
);
