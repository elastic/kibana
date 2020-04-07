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

import { unhashUrl } from '../../../../../plugins/kibana_utils/public';
import { toastNotifications } from '../../notify/toasts';
import { npSetup } from '../../new_platform';
import { areHashesDifferentButDecodedHashesEquals } from './sub_url_hooks_utils';

export function registerSubUrlHooks(angularModule, internals) {
  angularModule.run(($rootScope, Private, $location) => {
    const subUrlRouteFilter = Private(SubUrlRouteFilterProvider);

    function updateSubUrls() {
      const urlWithHashes = window.location.href;
      let urlWithStates;
      try {
        urlWithStates = unhashUrl(urlWithHashes);
      } catch (e) {
        toastNotifications.addDanger(e.message);
      }

      internals.trackPossibleSubUrl(urlWithStates || urlWithHashes);
    }

    function onRouteChange($event) {
      if (subUrlRouteFilter($event)) {
        updateUsage($event);
        updateSubUrls();
      }
    }

    $rootScope.$on('$locationChangeStart', (e, newUrl) => {
      // This handler fixes issue #31238 where browser back navigation
      // fails due to angular 1.6 parsing url encoded params wrong.
      if (areHashesDifferentButDecodedHashesEquals($location.absUrl(), newUrl)) {
        // replace the urlencoded hash with the version that angular sees.
        const newHash = newUrl.split('#')[1] || '';
        $location.url(newHash).replace();
      }
    });

    $rootScope.$on('$routeChangeSuccess', onRouteChange);
    $rootScope.$on('$routeUpdate', onRouteChange);
    updateSubUrls();
  });
}

function updateUsage($event) {
  const scope = $event.targetScope;
  const app = scope.chrome.getApp();
  const appId = app.id === 'kibana' ? scope.getFirstPathSegment() : app.id;
  if (npSetup.plugins.usageCollection) npSetup.plugins.usageCollection.__LEGACY.appChanged(appId);
}

/**
 *  Creates a function that will be called on each route change
 *  to determine if the event should be used to update the last
 *  subUrl of chrome links/tabs
 *  @injected
 */
export function SubUrlRouteFilterProvider($injector) {
  if (!$injector.has('$route')) {
    return function alwaysUpdate() {
      return true;
    };
  }

  const $route = $injector.get('$route');
  return function ignoreRedirectToRoutes() {
    return Boolean($route.current && !$route.current.redirectTo);
  };
}
