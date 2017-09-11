import { handleActions } from 'redux-actions';

import {
  fetchedIndexPattern,
} from '../actions/index-pattern-view';

// import {
//   getIndexPatternView,
// } from '../../reducers';

const defaultState = {
  indexPattern: undefined,
};

export default handleActions({
  [fetchedIndexPattern](state, { payload: { indexPattern } }) {
    return {
      ...state,
      indexPattern,
    };
  },
}, defaultState);

// export const getView = state => getIndexPatternView(state).items;
