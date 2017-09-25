import { handleActions } from 'redux-actions';
import { set } from 'object-path-immutable';

import {
  fetchedIndexPattern,
  setAsDefaultIndexPattern,
} from '../actions/index-pattern-view';

import {
  getIndexPatternView,
} from '../../reducers';

const defaultState = {
  indexPattern: {
    pattern: undefined,
    fields: undefined,
    timeFieldName: undefined,
    isDefault: undefined,
    id: undefined,
  },
  fieldsTable: {},
  tabs: {},
};

export default handleActions({
  [fetchedIndexPattern](state, { payload: { indexPattern } }) {
    return {
      ...state,
      indexPattern,
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
export const getTabs = state => getIndexPatternView(state).tabs;
