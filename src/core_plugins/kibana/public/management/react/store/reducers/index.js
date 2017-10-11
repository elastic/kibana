import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';

import { app } from './app';
import { indexPatternCreation } from './index_pattern_creation';
import { indexPatterns } from './index_patterns';
import { indexPattern } from './index_pattern';
import { indices } from './indices';
import { timeField } from './time_field';
import { timeFields } from './time_fields';

export const rootReducer = combineReducers({
  routing: routerReducer,
  app,
  indexPattern,
  indexPatternCreation,
  indexPatterns,
  indices,
  timeField,
  timeFields,
});

export const getIsCreating = state => state.indexPatternCreation.isCreating;

const getIndexPattern = state => state.indexPattern;
export const getSelectedIndexPattern = state => getIndexPattern(state).pattern;
export const getSelectedIndexFields = state => getIndexPattern(state).fields;
export const getSelectedIndexTimeFieldName = state => getIndexPattern(state).timeFieldName;
export const getSelectedIndexIsDefault = state => getIndexPattern(state).isDefault;
export const getSelectedIndexId = state => getIndexPattern(state).id;

export const getIndexPatterns = state => state.indexPatterns;

const getIndices = state => state.indices;
export const getSearchIndices = state => getIndices(state).foundIndices;
export const getSearchIndicesFiltered = (state, isIncludingSystemIndices) => {
  const indices = getSearchIndices(state);

  if (!indices) {
    return [];
  }

  return indices.filter(index => {
    return isIncludingSystemIndices || index.name[0] !== '.';
  });
};
export const getSearchPattern = state => getIndices(state).pattern;
export const getSearchHasExactMatches = state => getIndices(state).hasExactMatches;

export const getTimeField = state => state.timeField;
export const getTimeFields = state => state.timeFields;

