/* eslint-disable */
import {
  FETCHED_INDEX_PATTERNS,
} from './index-pattern-list.actions';

const defaultState = {
  indexPatterns: [],
};

export default function indexPatternList(state = defaultState, action) {
  switch (action.type) {
    case FETCHED_INDEX_PATTERNS:
      return Object.assign({}, state, { indexPatterns: action.patterns });
    default:
      return state;
  }
};
