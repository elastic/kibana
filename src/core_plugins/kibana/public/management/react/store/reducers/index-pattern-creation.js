import { handleActions } from 'redux-actions';

import {
  selectTimeField,
  fetchedTimeFields,
  fetchedIndices,
  creatingIndexPattern,
  createdIndexPattern,
} from '../actions/index-pattern-creation';

import {
  getIndexPatternCreation,
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
};

export const indexPatternCreation = handleActions({
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
  [creatingIndexPattern](state) {
    return {
      ...state,
      isCreating: true,
    };
  },
  [createdIndexPattern](state) {
    return {
      ...state,
      isCreating: false,
    };
  },
}, defaultState);

export const getPattern = state => getIndexPatternCreation(state).results.pattern;
export const getSelectedTimeField = state => getIndexPatternCreation(state).timeFields.selectedTimeField;
export const getTimeFields = state => getIndexPatternCreation(state).timeFields;
export const getCreation = state => {
  const {
    isIncludingSystemIndices,
    isCreating,
    results: {
      hasExactMatches,
    },
  } = getIndexPatternCreation(state);
  return { isCreating, isIncludingSystemIndices, hasExactMatches };
};
export const getIsIncludingSystemIndices = state => getIndexPatternCreation(state).isIncludingSystemIndices;
export const getResults = state => getIndexPatternCreation(state).results;
