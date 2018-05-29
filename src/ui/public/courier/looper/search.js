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

import { FetchSoonProvider } from '../fetch';
import { requestQueue } from '../_request_queue';
import { LooperProvider } from './_looper';

export function SearchLooperProvider(Private, Promise, $rootScope) {
  const fetchSoon = Private(FetchSoonProvider);

  const Looper = Private(LooperProvider);

  /**
   * The Looper which will manage the doc fetch interval
   * @type {Looper}
   */
  const searchLooper = new Looper(null, function () {
    $rootScope.$broadcast('courier:searchRefresh');
    const requests = requestQueue.getInactive();
    // promise returned from fetch.these() only resolves when
    // the requests complete, but we want to continue even if
    // the requests abort so we make our own
    fetchSoon.these(requests);
    return Promise.all(requests.map(request => request.getCompleteOrAbortedPromise()));
  });

  searchLooper.onHastyLoop = function () {
    if (searchLooper.afterHastyQueued) return;

    searchLooper.afterHastyQueued = Promise.resolve(searchLooper.active)
      .then(function () {
        return searchLooper._loopTheLoop();
      })
      .finally(function () {
        searchLooper.afterHastyQueued = null;
      });
  };

  return searchLooper;
}
