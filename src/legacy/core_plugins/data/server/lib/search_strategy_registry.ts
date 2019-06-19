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

import { Request } from 'hapi';
import { sortByOrder } from 'lodash';
import { Legacy } from 'kibana';
import { SearchOptions } from '../../common';

export interface SearchStrategy {
  // When looking up the search strategy for a given request, we order by priority before calling
  // `isViable`. A higher number means a higher priority. The default search strategy priority is 10.
  priority: number;

  // A function to determine whether this search strategy is viable for the given request.
  isViable: (request: Request, index: string, body: any) => Promise<boolean>;

  // The function to actually invoke the call to Elasticsearch.
  search: (request: Request, index: string, body: any, options?: SearchOptions) => Promise<any>;
}

const searchStrategies: SearchStrategy[] = [];

/**
 * Registers the given search strategy. Order matters! Search strategies that are registered earlier will take
 * precedence over those that are registered later.
 * @param searchStrategy The search strategy to register
 */
export function registerSearchStrategy(searchStrategy: SearchStrategy) {
  searchStrategies.push(searchStrategy);
}

/**
 * Go through the list of registered search strategies, ordered by priority, and return the first
 * that is viable for the given request.
 * @param request The request that initiated this search
 * @param index The index pattern/title to search
 * @param body The Elasticsearch body
 */
export function getSearchStrategy(request: Request, index: string, body: any) {
  const orderedStrategies = sortByOrder(searchStrategies, 'priority', 'desc');
  return orderedStrategies.reduce(
    async (promise: Promise<SearchStrategy | null>, currentSearchStrategy) => {
      const viableSearchStrategy = await promise;
      if (viableSearchStrategy !== null) return viableSearchStrategy;
      const isViable = await currentSearchStrategy.isViable(request, index, body);
      return isViable ? currentSearchStrategy : null;
    },
    Promise.resolve(null)
  );
}

/**
 * Registers the default search strategy, which simply sends the request to the `_search`
 * Elasticsearch endpoint.
 */
export function registerDefaultSearchStrategy(server: Legacy.Server) {
  registerSearchStrategy({
    priority: 10,
    isViable: async () => true,
    search: async function defaultSearchStrategy(
      request: Request,
      index: string,
      body: any,
      { signal, onProgress = () => {} }: SearchOptions = {}
    ) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      try {
        const response = await callWithRequest(request, 'search', { index, body }, { signal });
        onProgress(response._shards);
        return response;
      } catch (e) {
        return server.plugins.kibana.handleEsError(e);
      }
    },
  });
}
