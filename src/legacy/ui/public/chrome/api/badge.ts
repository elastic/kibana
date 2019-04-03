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

import { IRootScopeService } from 'angular';
import { fatalError } from 'ui/notify/fatal_error';
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
  // A flag used to determine if we should automatically
  // clear the badge between angular route changes.
  let badgeSetSinceRouteChange = false;

  // reset badgeSetSinceRouteChange any time the badge changes, even
  // if it was done directly through the new platform
  newPlatformChrome.getBadge$().subscribe({
    next() {
      badgeSetSinceRouteChange = true;
    },
  });

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
      set(newBadge: Badge | null) {
        newPlatformChrome.setBadge(newBadge);
      },
    },

    /**
     * internal angular run function that will be called when angular bootstraps and
     * lets us integrate with the angular router so that we can automatically clear
     * the badge if we switch to a Kibana app that does not use the badge correctly
     */
    $setupBadgeAutoClear: ($rootScope: IRootScopeService, $injector: any) => {
      const $route = $injector.has('$route') ? $injector.get('$route') : {};

      $rootScope.$on('$routeChangeStart', () => {
        badgeSetSinceRouteChange = false;
      });

      $rootScope.$on('$routeChangeSuccess', () => {
        const current = $route.current || {};

        if (badgeSetSinceRouteChange || (current.$$route && current.$$route.redirectTo)) {
          return;
        }

        const badgeProvider = current.badge;
        if (!badgeProvider) {
          newPlatformChrome.setBadge(null);
          return;
        }

        try {
          chrome.badge.set($injector.invoke(badgeProvider));
        } catch (error) {
          fatalError(error);
        }
      });
    },
  };
}

export function initBadgeApi(chrome: { [key: string]: any }, internals: { [key: string]: any }) {
  const { badge, $setupBadgeAutoClear } = createBadgeApi(chrome);
  chrome.badge = badge;
  internals.$setupBadgeAutoClear = $setupBadgeAutoClear;
}
