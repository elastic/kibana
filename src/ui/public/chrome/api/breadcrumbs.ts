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

// @ts-ignore
import { uiModules } from 'ui/modules';
import { Breadcrumb, ChromeStartContract } from '../../../../core/public/chrome';
export { Breadcrumb };

let newPlatformChrome: ChromeStartContract;
export function __newPlatformInit__(instance: ChromeStartContract) {
  if (newPlatformChrome) {
    throw new Error('ui/chrome/api/breadcrumbs is already initialized');
  }

  newPlatformChrome = instance;
}

export function initBreadcrumbsApi(
  chrome: { [key: string]: any },
  internals: { [key: string]: any }
) {
  // A flag used to keep track of clearing between route changes.
  let shouldClear = false;

  newPlatformChrome.getBreadcrumbs$().subscribe({
    next() {
      shouldClear = false;
    },
  });

  internals.$setupBreadcrumbsAutoClear = ($rootScope: any) => {
    // When a route change happens we want to clear the breadcrumbs ONLY if
    // the new route does not set any breadcrumbs. Deferring the clearing until
    // the route finishes changing helps avoiding the breadcrumbs from 'flickering'.
    $rootScope.$on('$routeChangeStart', () => {
      shouldClear = true;
    });

    $rootScope.$on('$routeChangeSuccess', () => {
      if (shouldClear) {
        newPlatformChrome.setBreadcrumbs([]);
      }
    });
  };

  chrome.breadcrumbs = {
    get$() {
      return newPlatformChrome.getBreadcrumbs$();
    },

    set(newBreadcrumbs: Breadcrumb[]) {
      newPlatformChrome.setBreadcrumbs(newBreadcrumbs);
    },
  };
}
