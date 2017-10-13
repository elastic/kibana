import { handleActions } from 'redux-actions';

import {
  fetchedIndexPatterns,
} from '../actions/index_patterns';

const defaultState = [];

export const indexPatterns = handleActions({
  [fetchedIndexPatterns](state, { payload }) {
    const { indexPatterns } = payload;
    return indexPatterns;
  },
}, defaultState);
