import _ from 'lodash';

import { SearchSourceProvider } from 'ui/courier/data_source/search_source';

import { reverseSortDirective } from './utils/sorting';


function fetchContextProvider(courier, Private) {
  const SearchSource = Private(SearchSourceProvider);

  return {
    fetchPredecessors,
    fetchSuccessors,
  };

  async function fetchSuccessors(indexPatternId, anchorDocument, contextSort, size, filters) {
    const successorsSearchSource = await createSearchSource(
      indexPatternId,
      anchorDocument,
      contextSort,
      size,
      filters,
    );
    const results = await performQuery(successorsSearchSource);
    return results;
  }

  async function fetchPredecessors(indexPatternId, anchorDocument, contextSort, size, filters) {
    const predecessorsSort = contextSort.map(reverseSortDirective);
    const predecessorsSearchSource = await createSearchSource(
      indexPatternId,
      anchorDocument,
      predecessorsSort,
      size,
      filters,
    );
    const reversedResults = await performQuery(predecessorsSearchSource);
    const results = reversedResults.slice().reverse();
    return results;
  }

  async function createSearchSource(indexPatternId, anchorDocument, sort, size, filters) {

    const indexPattern = await courier.indexPatterns.get(indexPatternId);

    return new SearchSource()
      .inherits(false)
      .set('index', indexPattern)
      .set('version', true)
      .set('size', size)
      .set('filter', filters)
      .set('query', {
        match_all: {},
      })
      .set('searchAfter', anchorDocument.sort)
      .set('sort', sort);
  }

  async function performQuery(searchSource) {
    const response = await searchSource.fetchAsRejectablePromise();

    return _.get(response, ['hits', 'hits'], []);
  }
}


export {
  fetchContextProvider,
};
