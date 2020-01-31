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
import { npSetup } from 'ui/new_platform';

const newPlatformHttp = npSetup.core.http;

export function initLoadingCountApi(chrome) {
  const manualCount$ = new Rx.BehaviorSubject(0);
  newPlatformHttp.addLoadingCount(manualCount$);

  chrome.loadingCount = new (class ChromeLoadingCountApi {
    /**
     * Call to add a subscriber to for the loading count that
     * will be called every time the loading count changes.
     *
     * @type {Observable<number>}
     * @return {Function} unsubscribe
     */
    subscribe(handler) {
      const subscription = newPlatformHttp.getLoadingCount$().subscribe({
        next(count) {
          handler(count);
        },
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
  })();
}
