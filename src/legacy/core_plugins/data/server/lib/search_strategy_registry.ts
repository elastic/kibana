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
import { Legacy } from 'kibana';

export interface SearchStrategy {
  isViable: (server: Legacy.Server, request: Request, index: string, body: any) => Promise<boolean>;
  search: (server: Legacy.Server, request: Request, index: string, body: any) => Promise<any>;
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
 * Go through the list of registered search strategies and return the first that is viable for the given request. If
 * none are viable, return the default search strategy.
 * @param server The Kibana server
 * @param request The request that initiated this search
 * @param index The index pattern/title to search
 * @param body The Elasticsearch body
 */
export async function getSearchStrategy(
  server: Legacy.Server,
  request: Request,
  index: string,
  body: any
) {
  const searchStrategy = await searchStrategies.reduce(
    async (promise: Promise<SearchStrategy | null>, currentSearchStrategy) => {
      const viableSearchStrategy = await promise;
      if (viableSearchStrategy !== null) return viableSearchStrategy;
      const isViable = await currentSearchStrategy.isViable(server, request, index, body);
      return isViable ? currentSearchStrategy : null;
    },
    Promise.resolve(null)
  );
  return searchStrategy !== null ? searchStrategy : defaultSearchStrategy;
}

/**
 * The default search strategy. Simply sends the request to the `_search` Elasticsearch endpoint. Aborts the request to
 * Elasticsearch if the request itself is disconnected.
 */
export const defaultSearchStrategy: SearchStrategy = {
  isViable: async () => true,
  search: async function defaultSearchStrategy(
    server: Legacy.Server,
    request: Request,
    index: string,
    body: any
  ) {
    const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
    const controller = new AbortController();
    const { signal } = controller;
    request.events.once('disconnect', () => controller.abort());
    try {
      return await callWithRequest(request, 'search', { index, body }, { signal });
    } catch (e) {
      return server.plugins.kibana.handleEsError(e);
    }
  },
};
