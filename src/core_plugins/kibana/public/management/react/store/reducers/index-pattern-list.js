import { handleActions } from 'redux-actions';

import {
  fetchedIndexPatterns,
  setTransientTableId,
} from '../actions/index-pattern-list';

import {
  getIndexPatternList,
} from '../../reducers';

const defaultState = {
  items: undefined,
  transientTableId: undefined,
};

export default handleActions({
  [fetchedIndexPatterns](state, { payload }) {
    const { indexPatterns } = payload;

    return {
      ...state,
      items: indexPatterns,
    };
  },
  [setTransientTableId](state, { payload: { id: transientTableId } }) {
    return {
      ...state,
      transientTableId,
    };
  }
}, defaultState);

export const getIndexPatterns = state => getIndexPatternList(state).indexPatterns;
