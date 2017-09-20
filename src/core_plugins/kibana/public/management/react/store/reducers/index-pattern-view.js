import { handleActions } from 'redux-actions';
import { set } from 'object-path-immutable';

import {
  fetchedIndexPattern,
  // setTransientId,
  // setResultsTransientId,
  change,
  setAsDefaultIndexPattern,
} from '../actions/index-pattern-view';

import {
  changeSort,
  changeFilter,
  changePaginate,
} from '../actions/shared';

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
  tabs: undefined,
  transient: undefined,
};

export default handleActions({
  [fetchedIndexPattern](state, { payload: { indexPattern } }) {
    return {
      ...state,
      indexPattern,
    };
  },
  // [change](state, { payload: { selectorPath, data } }) {
  //   return set(state, selectorPath, data);
  // },
  [changeSort](state, { payload: { sortBy, sortAsc } }) {
    return {
      ...state,
      fieldsTable: {
        ...state.fieldsTable,
        sortBy,
        sortAsc,
      },
    };
  },
  [changeFilter](state, { payload: { filterBy } }) {
    return {
      ...state,
      fieldsTable: {
        ...state.fieldsTable,
        filterBy,
      },
    };
  },
  [changePaginate](state, { payload: { page, perPage } }) {
    return {
      ...state,
      fieldsTable: {
        ...state.fieldsTable,
        page,
        perPage,
      },
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
export const getPathToFieldsTable = () => 'fieldsTable';
export const getFieldsTable = state => getIndexPatternView(state).fieldsTable;
export const getPathToTabs = () => 'tabs';
export const getPathToTransient = () => 'transient';
