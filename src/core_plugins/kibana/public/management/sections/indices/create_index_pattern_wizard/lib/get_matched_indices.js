import { MAX_NUMBER_OF_MATCHING_INDICES } from '../constants';
import { isQueryAMatch } from './is_query_a_match';

function isSystemIndex(index) {
  if (index.startsWith('.')) {
    return true;
  }

  if (index.includes(':')) {
    return index.split(':').reduce((isSystem, index) => isSystem || isSystemIndex(index), false);
  }

  return false;
}

function filterSystemIndices(indices, isIncludingSystemIndices) {
  if (!indices) {
    return indices;
  }

  const acceptableIndices = isIncludingSystemIndices
    ? indices
    // All system indices begin with a period.
    : indices.filter(index => !isSystemIndex(index.name));

  return acceptableIndices.slice(0, MAX_NUMBER_OF_MATCHING_INDICES);
}

export function getMatchedIndices(
  unfilteredAllIndices,
  unfilteredPartialMatchedIndices,
  query,
  isIncludingSystemIndices
) {
  const allIndices = filterSystemIndices(unfilteredAllIndices, isIncludingSystemIndices);
  const partialMatchedIndices = filterSystemIndices(unfilteredPartialMatchedIndices, isIncludingSystemIndices);

  const exactIndices = partialMatchedIndices.filter(({ name }) => isQueryAMatch(query, name));
  const exactMatchedIndices = filterSystemIndices(exactIndices, isIncludingSystemIndices);

  let visibleIndices;
  if (exactMatchedIndices.length) {
    visibleIndices = exactMatchedIndices;
  }
  else if (partialMatchedIndices.length) {
    visibleIndices = partialMatchedIndices;
  }
  else {
    visibleIndices = allIndices;
  }

  return {
    allIndices,
    exactMatchedIndices,
    partialMatchedIndices,
    visibleIndices,
  };
}
