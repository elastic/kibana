import { handleActions } from 'redux-actions';
import { createSelector } from 'reselect';
import { chunk, sortBy as sortByLodash, pick } from 'lodash';
import { set } from 'object-path-immutable';

import {
  selectTimeField,
  fetchedTimeFields,
  fetchedIndices,
  includeSystemIndices,
  excludeSystemIndices,
  creatingIndexPattern,
  createdIndexPattern,
} from '../actions/index-pattern-creation';

import {
  getIndexPatternCreate,
} from '../../reducers';

const defaultState = {
  isIncludingSystemIndices: false,
  isCreating: false,
  timeFields: {
    timeFields: undefined,
    selectedTimeField: undefined,
  },
  results: {
    indices: undefined,
    pattern: undefined,
    hasExactMatches: false,
  }
}

export default handleActions({
  [selectTimeField](state, { payload }) {
    const { timeFields } = payload;

    return {
      ...state,
      timeFields: {
        ...state.timeFields,
        timeFields,
      },
    };
  },
  [fetchedTimeFields](state, { payload }) {
    const { timeFields } = payload;

    return {
      ...state,
      timeFields: {
        ...state.timeFields,
        timeFields,
      },
    };
  },
  [selectTimeField](state, { payload }) {
    const { timeField } = payload;

    return {
      ...state,
      timeFields: {
        ...state.timeFields,
        selectedTimeField: timeField,
      },
    };
  },
  [fetchedIndices](state, { payload }) {
    const { indices, hasExactMatches, pattern } = payload;

    return {
      ...state,
      results: {
        ...state.results,
        indices,
        hasExactMatches,
        pattern,
      },
    };
  },
  [creatingIndexPattern](state, action) {
    return {
      ...state,
      isCreating: true,
    };
  },
  [createdIndexPattern](state, action) {
    return {
      ...state,
      isCreating: false,
    };
  },
}, defaultState);

export const getPattern = state => getIndexPatternCreate(state).results.pattern;
export const getSelectedTimeField = state => getIndexPatternCreate(state).timeFields.selectedTimeField;
export const getTimeFields = state => getIndexPatternCreate(state).timeFields;
export const getCreation = state => {
  const {
    isIncludingSystemIndices,
    isCreating,
    results: {
      hasExactMatches,
    },
  } = getIndexPatternCreate(state);
  return { isCreating, isIncludingSystemIndices, hasExactMatches };
};
export const getIsIncludingSystemIndices = state => getIndexPatternCreate(state).isIncludingSystemIndices;
export const getResults = state => getIndexPatternCreate(state).results;
