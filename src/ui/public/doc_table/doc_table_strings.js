/**
 * A message letting the user know the results that have been retrieved is limited
 * to a certain size.
 * @param resultCount {Number}
 */
export function getLimitedSearchResultsMessage(resultCount) {
  return `Limited to ${resultCount} results. Refine your search.`;
}
