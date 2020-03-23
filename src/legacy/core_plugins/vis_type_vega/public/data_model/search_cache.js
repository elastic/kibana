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

import LruCache from 'lru-cache';

export class SearchCache {
  constructor(es, cacheOpts) {
    this._es = es;
    this._cache = new LruCache(cacheOpts);
  }

  /**
   * Execute multiple searches, possibly combining the results of the cached searches
   * with the new ones already in cache
   * @param {object[]} requests array of search requests
   */
  search(requests) {
    const promises = [];

    for (const request of requests) {
      const key = JSON.stringify(request);
      let pending = this._cache.get(key);
      if (pending === undefined) {
        pending = this._es.search(request);
        this._cache.set(key, pending);
      }
      promises.push(pending);
    }

    return Promise.all(promises);
  }
}
