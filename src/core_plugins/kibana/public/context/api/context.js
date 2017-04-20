import _ from 'lodash';

import { SearchSourceProvider } from 'ui/courier/data_source/search_source';

import { reverseSortDirective } from './utils/sorting';


function fetchContextProvider(Private) {
  const SearchSource = Private(SearchSourceProvider);

  return {
    fetchPredecessors,
    fetchSuccessors,
  };

  async function fetchSuccessors(indexPattern, anchorDocument, contextSort, size) {
    const successorsSort = [contextSort, { _uid: 'asc' }];
    const successorsSearchSource = createSearchSource(
      indexPattern,
      anchorDocument,
      successorsSort,
      size,
    );
    const results = await performQuery(successorsSearchSource);
    return results;
  }

  async function fetchPredecessors(indexPattern, anchorDocument, contextSort, size) {
    const predecessorsSort = [reverseSortDirective(contextSort), { _uid: 'desc' }];
    const predecessorsSearchSource = createSearchSource(
      indexPattern,
      anchorDocument,
      predecessorsSort,
      size,
    );
    const reversedResults = await performQuery(predecessorsSearchSource);
    const results = reversedResults.slice().reverse();
    return results;
  }

  function createSearchSource(indexPattern, anchorDocument, sort, size) {
    return new SearchSource()
      .inherits(false)
      .set('index', indexPattern)
      .set('version', true)
      .set('size', size)
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
