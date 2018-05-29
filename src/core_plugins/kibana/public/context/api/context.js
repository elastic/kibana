/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
        query: {
          match_all: {},
        },
        language: 'lucene'
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
