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
import { from } from 'rxjs';
import { SearchArguments, SearchOptions } from '../../common';

/**
 * The client-side API for making requests to Elasticsearch using raw Elasticsearch request DSL.
 *
 * @example
 * const index = 'twitter';
 * const body = { query: { match_all: {} } };
 * const results = await search({
 *   searchParams: { index, body }
 * }).toPromise();
 *
 * @example
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 1000);
 * const index = 'twitter';
 * const body = { query: { match_all: {} } };
 * const results$ = search({
 *   searchParams: { index, body },
 *   signal
 * });
 * results$.subscribe({
 *   next: response => {
 *     console.log(response._shards.successful / response._shards.total);
 *   },
 *   complete: response => {
 *     console.log('got response: ', response);
 *   },
 *   error: error => {
 *     console.log('got error: ', error);
 *   }
 * });
 */
export function search({ searchParams, signal, options = {} }: SearchArguments) {
  const query = getSearchOptions(options);
  const promise = kfetch({
    method: 'POST',
    pathname: `../api/search`,
    query,
    body: JSON.stringify(searchParams),
    signal: typeof signal !== 'undefined' ? signal : null,
  });
  return from(promise);
}

// Not really a "session" ID per se, but just something unique to this browser load so that
// requests can hit the same shards if the `preference` setting is set to this
const sessionId = `${Date.now()}`;

export function getSearchOptions(options: SearchOptions) {
  return {
    sessionId,
    ...options,
  };
}
