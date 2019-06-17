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

import 'abortcontroller-polyfill';
import { Legacy } from 'kibana';
import { SearchOptions } from '../../common';
import { Request } from '../../../elasticsearch';
import { getSearchStrategy } from '../lib';

export function registerSearchApi(server: Legacy.Server): void {
  server.route({
    path: '/api/search/{index}',
    method: 'POST',
    handler: async req => {
      const body = req.payload;
      const { index } = req.params;
      const searchStrategy = await getSearchStrategy(server, req, index, body);
      return searchStrategy.search(server, req, index, body);
    },
  });

  /**
   * The server-side API for making requests to Elasticsearch using raw Elasticsearch query DSL.
   *
   * @param req The original request the client made (used to forward user credentials to Elasticsearch)
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
   * const response = await server.plugins.data.search(request, 'twitter', body, options);
   */
  server.expose('search', (req: Request, index: string, body: any, options: SearchOptions = {}) => {
    const { signal, onProgress = () => {} } = options;
    const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
    const promise = callWithRequest(req, 'search', { index, body }, { signal });
    promise.then(response => onProgress(response._shards));
    return promise;
  });
}
