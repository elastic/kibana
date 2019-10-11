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
import { addSearchStrategy } from './search_strategy_registry';
import { isDefaultTypeIndexPattern } from './is_default_type_index_pattern';
import {
  getSearchParams,
  getMSearchParams,
  getPreference,
  getTimeout,
} from '../fetch/get_search_params';

export const defaultSearchStrategy: SearchStrategyProvider = {
  id: 'default',

  search: params => {
    return params.config.get('courier:batchSearches') ? msearch(params) : search(params);
  },

  isViable: indexPattern => {
    return indexPattern && isDefaultTypeIndexPattern(indexPattern);
  },
};

function msearch({ searchRequests, es, config, esShardTimeout }: SearchStrategySearchParams) {
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
    searching: searching.then(({ responses }) => responses),
    abort: searching.abort,
  };
}

function search({ searchRequests, es, config, esShardTimeout }: SearchStrategySearchParams) {
  const abortController = new AbortController();
  const searchParams = getSearchParams(config, esShardTimeout);
  const promises = searchRequests.map(({ index, body }) => {
    const searching = es.search({ index: index.title || index, body, ...searchParams });
    abortController.signal.addEventListener('abort', searching.abort);
    return searching.catch(({ response }) => JSON.parse(response));
  });
  return {
    searching: Promise.all(promises),
    abort: () => abortController.abort(),
  };
}

addSearchStrategy(defaultSearchStrategy);
