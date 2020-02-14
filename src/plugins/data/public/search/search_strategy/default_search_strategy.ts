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

import { SearchStrategyProvider, SearchStrategySearchParams } from './types';
import { isDefault } from '../../index_patterns';
import { getSearchParams, getMSearchParams, getPreference, getTimeout } from './get_search_params';

export const defaultSearchStrategy: SearchStrategyProvider = {
  id: 'default',

  search: params => {
    return params.config.get('courier:batchSearches') ? msearch(params) : search(params);
  },

  isViable: indexPattern => {
    return indexPattern && isDefault(indexPattern);
  },
};

// @deprecated
function msearch({
  searchRequests,
  searchService,
  config,
  esShardTimeout,
}: SearchStrategySearchParams) {
  const es = searchService.__LEGACY.esClient;
  const inlineRequests = searchRequests.map(({ index, body, search_type: searchType }) => {
    const inlineHeader = {
      index: index.title || index,
      search_type: searchType,
      ignore_unavailable: true,
      preference: getPreference(config),
    };
    const inlineBody = {
      ...body,
      timeout: getTimeout(esShardTimeout),
    };
    return `${JSON.stringify(inlineHeader)}\n${JSON.stringify(inlineBody)}`;
  });

  const searching = es.msearch({
    ...getMSearchParams(config),
    body: `${inlineRequests.join('\n')}\n`,
  });

  return {
    searching: searching.then(({ responses }: any) => responses),
    abort: searching.abort,
  };
}

function search({
  searchRequests,
  searchService,
  config,
  esShardTimeout,
}: SearchStrategySearchParams) {
  const abortController = new AbortController();
  const searchParams = getSearchParams(config, esShardTimeout);
  const es = searchService.__LEGACY.esClient;
  const promises = searchRequests.map(({ index, body }) => {
    const searching = es.search({ index: index.title || index, body, ...searchParams });
    abortController.signal.addEventListener('abort', searching.abort);
    return searching.catch(({ response }: any) => JSON.parse(response));
    /*
     * Once #44302 is resolved, replace the old implementation with this one -
     * const params = {
     *   index: index.title || index,
     *   body,
     *   ...searchParams,
     * };
     * const { signal } = abortController;
     * return searchService
     *   .search({ params }, { signal })
     *   .toPromise()
     *   .then(({ rawResponse }) => rawResponse);
     */
  });
  return {
    searching: Promise.all(promises),
    abort: () => abortController.abort(),
  };
}
