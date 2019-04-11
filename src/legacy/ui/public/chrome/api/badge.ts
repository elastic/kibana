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

import { ChromeBadge, ChromeSetup } from '../../../../../core/public';
export type Badge = ChromeBadge;

export type BadgeApi = ReturnType<typeof createBadgeApi>['badge'];

let newPlatformChrome: ChromeSetup;
export function __newPlatformInit__(instance: ChromeSetup) {
  if (newPlatformChrome) {
    throw new Error('ui/chrome/api/badge is already initialized');
  }

  newPlatformChrome = instance;
}

function createBadgeApi(chrome: { [key: string]: any }) {
  return {
    badge: {
      /**
       * Get an observerable that emits the current badge
       * and emits each update to the badge
       */
      get$() {
        return newPlatformChrome.getBadge$();
      },

      /**
       * Replace the badge with a new one
       */
      set(newBadge: Badge | undefined) {
        newPlatformChrome.setBadge(newBadge);
      },
    },
  };
}

export function initChromeBadgeApi(
  chrome: { [key: string]: any },
  internals: { [key: string]: any }
) {
  const { badge } = createBadgeApi(chrome);
  chrome.badge = badge;
}
