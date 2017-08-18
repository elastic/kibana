/* eslint-disable */
import {
  FETCHED_INDICES,
  INCLUDE_SYSTEM_INDICES,
  EXCLUDE_SYSTEM_INDICES
} from './index-pattern.actions';

const defaultState = {
  indices: [],
  whiteListIndices: [],
  includeSystemIndices: false,
};

function whiteListIndices(indices, includeSystemIndices) {
  if (!indices) {
    return indices;
  }

  if (includeSystemIndices) {
    return indices;
  }

  // All system indices begin with a period.
  return indices.filter(index => !index.name.startsWith('.'));
};

export default function indexPattern(state = {}, action) {
  console.log('index-pattern.reducer', action);
  switch (action.type) {
    case FETCHED_INDICES:
      return Object.assign({}, state, {
        indices: action.indices,
        whiteListIndices: whiteListIndices(action.indices, state.includeSystemIndices),
      });
    case INCLUDE_SYSTEM_INDICES:
      return Object.assign({}, state, {
        includeSystemIndices: true,
        whiteListIndices: whiteListIndices(state.indices, true),
      });
    case EXCLUDE_SYSTEM_INDICES:
      return Object.assign({}, state, {
        includeSystemIndices: false,
        whiteListIndices: whiteListIndices(state.indices, false),
      });
  }
  return state;
};
