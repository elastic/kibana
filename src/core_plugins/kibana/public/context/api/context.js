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
    const successorsSort = [contextSort, { _uid: 'asc' }];
    const successorsSearchSource = await createSearchSource(
      indexPatternId,
      anchorDocument,
      successorsSort,
      size,
      filters,
    );
    const results = await performQuery(successorsSearchSource);
    return results;
  }

  async function fetchPredecessors(indexPatternId, anchorDocument, contextSort, size, filters) {
    const predecessorsSort = [reverseSortDirective(contextSort), { _uid: 'desc' }];
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
    const response = await searchSource.fetch();

    return _.get(response, ['hits', 'hits'], []);
  }
}


export {
  fetchContextProvider,
};
