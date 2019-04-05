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
import { ChromeBreadcrumb, ChromeSetup } from '../../../../../core/public';
export type Breadcrumb = ChromeBreadcrumb;

export type BreadcrumbsApi = ReturnType<typeof createBreadcrumbsApi>['breadcrumbs'];

let newPlatformChrome: ChromeSetup;
export function __newPlatformInit__(instance: ChromeSetup) {
  if (newPlatformChrome) {
    throw new Error('ui/chrome/api/breadcrumbs is already initialized');
  }

  newPlatformChrome = instance;
}

function createBreadcrumbsApi(chrome: { [key: string]: any }) {
  // A flag used to determine if we should automatically
  // clear the breadcrumbs between angular route changes.
  let breadcrumbSetSinceRouteChange = false;
  let currentBreadcrumbs: Breadcrumb[] = [];

  // reset breadcrumbSetSinceRouteChange any time the breadcrumbs change, even
  // if it was done directly through the new platform
  newPlatformChrome.getBreadcrumbs$().subscribe({
    next(nextBreadcrumbs) {
      breadcrumbSetSinceRouteChange = true;
      currentBreadcrumbs = nextBreadcrumbs;
    },
  });

  return {
    breadcrumbs: {
      /**
       * Get an observerable that emits the current list of breadcrumbs
       * and emits each update to the breadcrumbs
       */
      get$() {
        return newPlatformChrome.getBreadcrumbs$();
      },

      /**
       * Replace the set of breadcrumbs with a new set
       */
      set(newBreadcrumbs: Breadcrumb[]) {
        newPlatformChrome.setBreadcrumbs(newBreadcrumbs);
      },

      /**
       * Add a breadcrumb to the end of the list of breadcrumbs
       */
      push(breadcrumb: Breadcrumb) {
        newPlatformChrome.setBreadcrumbs([...currentBreadcrumbs, breadcrumb]);
      },

      /**
       * Filter the current set of breadcrumbs with a function. Works like Array#filter()
       */
      filter(fn: (breadcrumb: Breadcrumb, i: number, all: Breadcrumb[]) => boolean) {
        newPlatformChrome.setBreadcrumbs(currentBreadcrumbs.filter(fn));
      },
    },

    /**
     * internal angular run function that will be called when angular bootstraps and
     * lets us integrate with the angular router so that we can automatically clear
     * the breadcrumbs if we switch to a Kibana app that does not use breadcrumbs correctly
     */
    $setupBreadcrumbsAutoClear: ($rootScope: IRootScopeService, $injector: any) => {
      const $route = $injector.has('$route') ? $injector.get('$route') : {};

      $rootScope.$on('$routeChangeStart', () => {
        breadcrumbSetSinceRouteChange = false;
      });

      $rootScope.$on('$routeChangeSuccess', () => {
        const current = $route.current || {};

        if (breadcrumbSetSinceRouteChange || (current.$$route && current.$$route.redirectTo)) {
          return;
        }

        const k7BreadcrumbsProvider = current.k7Breadcrumbs;
        if (!k7BreadcrumbsProvider) {
          newPlatformChrome.setBreadcrumbs([]);
          return;
        }

        try {
          chrome.breadcrumbs.set($injector.invoke(k7BreadcrumbsProvider));
        } catch (error) {
          fatalError(error);
        }
      });
    },
  };
}

export function initBreadcrumbsApi(
  chrome: { [key: string]: any },
  internals: { [key: string]: any }
) {
  const { breadcrumbs, $setupBreadcrumbsAutoClear } = createBreadcrumbsApi(chrome);
  chrome.breadcrumbs = breadcrumbs;
  internals.$setupBreadcrumbsAutoClear = $setupBreadcrumbsAutoClear;
}
