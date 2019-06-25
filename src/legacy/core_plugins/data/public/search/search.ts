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

import { kfetch } from 'ui/kfetch';
import { SearchOptions } from '../../common';

// Not really a "session" ID per se, but just something unique to this browser load so that
// requests can hit the same shards if the `preference` setting is set to this
const sessionId = `${Date.now()}`;

/**
 * The client-side API for making requests to Elasticsearch using raw Elasticsearch query DSL.
 *
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
 * const response = await search('twitter', body, options);
 */
export function search(index: string, body: any, options: SearchOptions = {}) {
  const { signal, onProgress = () => {}, strategy } = options;
  const query = strategy ? { strategy, sessionId } : { sessionId };
  const promise = kfetch({
    method: 'POST',
    pathname: `../api/search/${index}`,
    query,
    body: JSON.stringify(body),
    signal,
  });
  promise.then(response => onProgress(response._shards));
  return promise;
}
