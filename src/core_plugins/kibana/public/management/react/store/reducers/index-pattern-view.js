import { handleActions } from 'redux-actions';

import {
  fetchedIndexPattern,
  setTransientId,
  setResultsTransientId,
  setAsDefaultIndexPattern,
} from '../actions/index-pattern-view';

import {
  getIndexPatternView,
} from '../../reducers';

const defaultState = {
  indexPattern: undefined,
  transientId: undefined,
  resultsTransientId: undefined,
};

export default handleActions({
  [fetchedIndexPattern](state, { payload: { indexPattern } }) {
    return {
      ...state,
      indexPattern,
    };
  },
  [setTransientId](state, { payload: { id: transientId }}) {
    return {
      ...state,
      transientId,
    };
  },
  [setResultsTransientId](state, { payload: { id: resultsTransientId }}) {
    return {
      ...state,
      resultsTransientId,
    };
  },
  [setAsDefaultIndexPattern](state) {
    return {
      ...state,
      indexPattern: {
        ...state.indexPattern,
        isDefault: true,
      }
    }
  }
}, defaultState);

export const getPathToFields = () => 'indexPattern.fields';
