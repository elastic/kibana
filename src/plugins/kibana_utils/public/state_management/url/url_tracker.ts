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

import { BehaviorSubject, Observable } from 'rxjs';
import { AppUpdater } from 'kibana/public';

export type UrlTrackingEvent =
  | { type: 'CONTEXT_CHANGED'; urlUpdater: (oldUrl: string) => string }
  | { type: 'APP_MOUNT' }
  | { type: 'APP_UNMOUNT' };

export function createRealUrlTracker(
  baseUrl: string,
  events$: Observable<UrlTrackingEvent>,
  navLinkUpdater$: BehaviorSubject<AppUpdater>
) {
  // TODO pass this in or however
  const key = 'sdfdsf';
  const storage: Storage = sessionStorage;
  const storedUrl = storage.getItem(key);
  let currentUrl: string = '';
  const subscription = events$.subscribe(event => {
    switch (event.type) {
      case 'CONTEXT_CHANGED':
        currentUrl = event.urlUpdater(currentUrl);
        storage.setItem(key, currentUrl);
        break;
      case 'APP_UNMOUNT':
        navLinkUpdater$.next(() => ({ url: currentUrl }));
        break;
      case 'APP_MOUNT':
        navLinkUpdater$.next(() => ({ url: baseUrl }));
        break;
    }
  });

  if (storedUrl) {
    navLinkUpdater$.next(() => ({ url: storedUrl }));
  }

  return subscription.unsubscribe;
}
