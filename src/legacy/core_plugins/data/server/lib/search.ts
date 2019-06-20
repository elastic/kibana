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
import { SearchOptions } from '../../common';
import { getSearchStrategy } from './search_strategy_registry';

/**
 * The server-side API for making requests to Elasticsearch using raw Elasticsearch query DSL.
 *
 * @param request The original request the client made (used to forward user credentials to Elasticsearch)
 * @param index The name of the index (or title of the index pattern) to search
 * @param body The search body (Elasticsearch query DSL)
 * @param options Options for handling progress and aborting
 *
 * @example
 * const controller = new AbortController();
 * const onProgress = ({ successful, total }) => console.log(successful / total);
 * setTimeout(() => controller.abort(), 1000);
 * const body = { query: { match_all: {} } };
 * const options = { signal: controller.signal, onProgress };
 * const response = await search(request, 'twitter', body, options);
 */
export async function search(
  request: Request,
  index: string,
  body: any,
  options: SearchOptions = {}
) {
  const searchStrategy = await getSearchStrategy(options.strategy);
  if (typeof searchStrategy !== 'function') {
    throw new Error(`No search strategy registered with name ${options.strategy}`);
  }
  return searchStrategy(request, index, body, options);
}
