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

import { npStart } from 'ui/new_platform';
import { ChromeBreadcrumb } from '../../../../../core/public';
export type Breadcrumb = ChromeBreadcrumb;

export type BreadcrumbsApi = ReturnType<typeof createBreadcrumbsApi>['breadcrumbs'];

const newPlatformChrome = npStart.core.chrome;

function createBreadcrumbsApi(chrome: { [key: string]: any }) {
  let currentBreadcrumbs: Breadcrumb[] = [];

  // reset breadcrumbSetSinceRouteChange any time the breadcrumbs change, even
  // if it was done directly through the new platform
  newPlatformChrome.getBreadcrumbs$().subscribe({
    next(nextBreadcrumbs) {
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

      /**
       * Remove last element of the breadcrumb
       */
      pop() {
        newPlatformChrome.setBreadcrumbs(currentBreadcrumbs.slice(0, -1));
      },
    },
  };
}

export function initBreadcrumbsApi(
  chrome: { [key: string]: any },
  internals: { [key: string]: any }
) {
  const { breadcrumbs } = createBreadcrumbsApi(chrome);
  chrome.breadcrumbs = breadcrumbs;
}
