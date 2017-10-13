import { handleActions } from 'redux-actions';

import {
  fetchedIndices,
} from '../actions/indices';

const defaultState = {
  foundIndices: undefined,
  pattern: undefined,
  hasExactMatches: false,
};

export const indices = handleActions({
  [fetchedIndices](state, { payload }) {
    const { indices, pattern, hasExactMatches } = payload;
    return {
      ...state,
      foundIndices: indices,
      pattern,
      hasExactMatches,
    };
  }
}, defaultState);
