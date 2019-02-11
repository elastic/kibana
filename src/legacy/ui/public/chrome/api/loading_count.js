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

import * as Rx from 'rxjs';

import { isSystemApiRequest } from '../../system_api';

let newPlatformLoadingCount;

export function __newPlatformInit__(instance) {
  if (newPlatformLoadingCount) {
    throw new Error('ui/chrome/api/loading_count already initialized with new platform apis');
  }
  newPlatformLoadingCount = instance;
}

export function initLoadingCountApi(chrome, internals) {
  /**
   * Injected into angular module by ui/chrome angular integration
   * and adds a root-level watcher that will capture the count of
   * active $http requests on each digest loop and expose the count to
   * the core.loadingCount api
   * @param  {Angular.Scope} $rootScope
   * @param  {HttpService} $http
   * @return {undefined}
   */
  internals.capture$httpLoadingCount = function ($rootScope, $http) {
    newPlatformLoadingCount.add(new Rx.Observable(observer => {
      const unwatch = $rootScope.$watch(() => {
        const reqs = $http.pendingRequests || [];
        observer.next(reqs.filter(req => !isSystemApiRequest(req)).length);
      });

      return unwatch;
    }));
  };

  const manualCount$ = new Rx.BehaviorSubject(0);
  newPlatformLoadingCount.add(manualCount$);

  chrome.loadingCount = new class ChromeLoadingCountApi {
    /**
     * Call to add a subscriber to for the loading count that
     * will be called every time the loading count changes.
     *
     * @type {Observable<number>}
     * @return {Function} unsubscribe
     */
    subscribe(handler) {
      const subscription = newPlatformLoadingCount.getCount$().subscribe({
        next(count) {
          handler(count);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    /**
     * Increment the loading count by one
     * @return {undefined}
     */
    increment() {
      manualCount$.next(manualCount$.getValue() + 1);
    }

    /**
     * Decrement the loading count by one
     * @return {undefined}
     */
    decrement() {
      manualCount$.next(manualCount$.getValue() - 1);
    }
  };
}
