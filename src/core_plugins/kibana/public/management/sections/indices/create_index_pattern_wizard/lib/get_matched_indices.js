import { MAX_NUMBER_OF_MATCHING_INDICES } from '../constants';

function filterSystemIndices(indices, isIncludingSystemIndices) {
  if (!indices) {
    return indices;
  }

  const acceptableIndices = isIncludingSystemIndices
    ? indices
    // All system indices begin with a period.
    : indices.filter(index => !index.name.startsWith('.'));

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

  const exactIndices = partialMatchedIndices.filter(({ name }) => {
    if (name === query) {
      return true;
    }
    if (query.endsWith('*') && name.indexOf(query.substring(0, query.length - 1)) === 0) {
      return true;
    }
    return false;
  });
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
