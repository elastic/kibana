/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { GitBlame } from '../../common/git_blame';
import { loadBlame, loadBlameFailed, loadBlameSuccess } from '../actions/blame';

export interface BlameState {
  blames: GitBlame[];
  loading: boolean;
}

const initialState: BlameState = {
  blames: [],
  loading: false,
};

export const blame = handleActions(
  {
    [String(loadBlame)]: (state: BlameState, action: Action<any>) =>
      produce<BlameState>(state, draft => {
        draft.loading = true;
      }),
    [String(loadBlameSuccess)]: (state: BlameState, action: Action<any>) =>
      produce<BlameState>(state, draft => {
        draft.blames = action.payload;
        draft.loading = false;
      }),
    [String(loadBlameFailed)]: (state: BlameState, action: Action<any>) =>
      produce<BlameState>(state, draft => {
        draft.loading = false;
        draft.blames = [];
      }),
  },
  initialState
);
