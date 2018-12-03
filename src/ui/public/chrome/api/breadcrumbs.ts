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

// @ts-ignore
import { uiModules } from 'ui/modules';
import { fatalError } from 'ui/notify/fatal_error';
import { Breadcrumb, ChromeStartContract } from '../../../../core/public/chrome';
export { Breadcrumb };

export interface BreadcrumbsApi {
  get$(): ReturnType<ChromeStartContract['getBreadcrumbs$']>;
  set(newBreadcrumbs: Breadcrumb[]): void;
}

export interface WithBreadcrumbsApi {
  breadcrumbs: BreadcrumbsApi;
}

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
  // A flag used to determine if we should automatically
  // clear the breadcrumbs between angular route changes.
  let breadcrumbSetSinceRouteChange = false;

  // reset breadcrumbSetSinceRouteChange any time the breadcrumbs change, even
  // if it was done directly through the new platform
  newPlatformChrome.getBreadcrumbs$().subscribe({
    next() {
      breadcrumbSetSinceRouteChange = true;
    },
  });

  chrome.breadcrumbs = {
    get$() {
      return newPlatformChrome.getBreadcrumbs$();
    },

    set(newBreadcrumbs: Breadcrumb[]) {
      newPlatformChrome.setBreadcrumbs(newBreadcrumbs);
    },
  };

  // define internal angular run function that will be called when angular
  // bootstraps and lets us integrate with the angular router so that we can
  // automatically clear the breadcrumbs if we switch to a Kibana app that
  // does not use breadcrumbs correctly
  internals.$setupBreadcrumbsAutoClear = ($rootScope: IRootScopeService, $injector: any) => {
    const uiSettings = chrome.getUiSettingsClient();
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
      if (!k7BreadcrumbsProvider || !uiSettings.get('k7design')) {
        newPlatformChrome.setBreadcrumbs([]);
        return;
      }

      try {
        chrome.breadcrumbs.set($injector.invoke(k7BreadcrumbsProvider));
      } catch (error) {
        fatalError(error);
      }
    });
  };
}
