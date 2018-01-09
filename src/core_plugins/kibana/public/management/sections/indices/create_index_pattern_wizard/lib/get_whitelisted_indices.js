import { MAX_NUMBER_OF_MATCHING_INDICES } from '../constants';

function whitelist(indices, isIncludingSystemIndices) {
  if (!indices) {
    return indices;
  }

  const acceptableIndices = isIncludingSystemIndices
    ? indices
    // All system indices begin with a period.
    : indices.filter(index => !index.name.startsWith('.'));

  return acceptableIndices.slice(0, MAX_NUMBER_OF_MATCHING_INDICES);
}

export function getWhitelistedIndices(indices, isIncludingSystemIndices, query, matchingIndices) {
  const initialIndices = whitelist(indices, isIncludingSystemIndices);
  const partialMatchingIndices = whitelist(matchingIndices, isIncludingSystemIndices);

  const exactIndices = matchingIndices.filter(({ name }) => {
    if (name === query) {
      return true;
    }
    if (query.endsWith('*') && name.indexOf(query.substring(0, query.length - 1)) === 0) {
      return true;
    }
    return false;
  });
  const exactMatchingIndices = whitelist(exactIndices, isIncludingSystemIndices);

  let visibleIndices;
  if (exactMatchingIndices.length) {
    visibleIndices = exactMatchingIndices;
  }
  else if (partialMatchingIndices.length) {
    visibleIndices = partialMatchingIndices;
  }
  else {
    visibleIndices = initialIndices;
  }

  return {
    initialIndices,
    exactMatchingIndices,
    partialMatchingIndices,
    visibleIndices,
  };
}
