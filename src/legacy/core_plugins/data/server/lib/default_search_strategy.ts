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

import { Server, Request } from 'hapi';
import { SearchOptions } from '../../common';
import { registerSearchStrategy } from './search_strategies';
import { getEsSearchConfig } from './get_es_search_config';

export function registerDefaultSearchStrategy(server: Server) {
  registerSearchStrategy('default', async function defaultSearchStrategy(
    request: Request,
    index: string,
    body: any,
    { signal, onProgress = () => {} }: SearchOptions = {}
  ) {
    const config = await getEsSearchConfig(server, request);
    const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
    const promise = callWithRequest(request, 'search', { index, body, ...config }, { signal });
    return promise.then(response => {
      onProgress(response._shards);
      return response;
    }, server.plugins.kibana.handleEsError);
  });
}
