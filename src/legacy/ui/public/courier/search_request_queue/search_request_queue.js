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

class SearchRequestQueue {
  constructor() {
    // Queue of pending requests, requests are removed as they are processed by fetch.[sourceType]().
    this._searchRequests = [];
  }

  getCount() {
    return this._searchRequests.length;
  }

  add(searchRequest) {
    this._searchRequests.push(searchRequest);
  }

  remove(searchRequest) {
    // Remove all matching search requests.
    this._searchRequests = this._searchRequests.filter(
      existingSearchRequest => existingSearchRequest !== searchRequest
    );
  }

  removeAll() {
    this._searchRequests.length = 0;
  }

  abortAll() {
    this._searchRequests.forEach(searchRequest => searchRequest.abort());
  }

  getAll() {
    return this._searchRequests;
  }

  getSearchRequestAt(index) {
    return this._searchRequests[index];
  }

  getInactive() {
    return this._searchRequests.filter(searchRequest => !searchRequest.started);
  }

  getStartable() {
    return this._searchRequests.filter(searchRequest => searchRequest.canStart());
  }

  getPending() {
    return this._searchRequests.filter(searchRequest => searchRequest.isFetchRequestedAndPending());
  }
}

export const searchRequestQueue = new SearchRequestQueue();
