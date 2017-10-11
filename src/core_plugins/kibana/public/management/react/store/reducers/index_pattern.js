import { handleActions } from 'redux-actions';

import {
  fetchedIndexPattern,
  setAsDefaultIndexPattern,
} from '../actions/index_pattern';

const defaultState = {
  pattern: undefined,
  fields: undefined,
  timeFieldName: undefined,
  isDefault: undefined,
  id: undefined,
};

export const indexPattern = handleActions({
  [fetchedIndexPattern](state, { payload }) {
    const { pattern, fields, timeFieldName, isDefault, id } = payload;
    return {
      ...state,
      pattern,
      fields,
      timeFieldName,
      isDefault,
      id,
    };
  },
  [setAsDefaultIndexPattern](state) {
    return {
      ...state,
      indexPattern: {
        ...state.indexPattern,
        isDefault: true,
      },
    };
  },
}, defaultState);
