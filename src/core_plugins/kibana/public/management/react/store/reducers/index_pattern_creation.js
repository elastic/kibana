import { handleActions } from 'redux-actions';

import {
  creatingIndexPattern,
  createdIndexPattern,
} from '../actions/index_pattern_creation';

const defaultState = {
  isCreating: false,
};

export const indexPatternCreation = handleActions({
  [creatingIndexPattern]() {
    return { isCreating: true };
  },
  [createdIndexPattern]() {
    return { isCreating: false };
  },
}, defaultState);
