import { fetchIndexPatterns as libFetchIndexPatterns } from './lib/fetch-index-patterns';

export const fetchIndexPatterns = () => {
  return async dispatch => {
    dispatch(fetchedIndexPatterns(await libFetchIndexPatterns()));
  };
};

export const FETCHED_INDEX_PATTERNS = 'FETCHED_INDEX_PATTERNS';
export const fetchedIndexPatterns = (patterns) => {
  return {
    type: FETCHED_INDEX_PATTERNS,
    patterns,
  };
};
