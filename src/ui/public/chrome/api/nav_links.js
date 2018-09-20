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

import { parse as parseUrl } from 'url';

import {
  getUnhashableStatesProvider,
  unhashUrl,
} from '../../state_management/state_hashing';
import { absoluteToParsedUrl } from '../../url/absolute_to_parsed_url';

let newPlatformNavLinks;

export function __newPlatformInit__(instance) {
  if (newPlatformNavLinks) {
    throw new Error('ui/chrome/api/injected_vars is already initialized');
  }

  newPlatformNavLinks = instance;
}

export function initChromeNavLinksApi(chrome, internals) {
  chrome.navLinks = newPlatformNavLinks;

  internals.navLinksAngularInit = function ($injector, Private) {
    // disable if angular routing is not enabled
    if (!$injector.has('$route')) {
      return;
    }

    const $route = $injector.get('$route');
    const getUnhashableStates = Private(getUnhashableStatesProvider);
    const basePath = chrome.getBasePath();

    const getRouteForUrl = url => {
      const parsedUrl = absoluteToParsedUrl(url, basePath);

      if (!parsedUrl.appPath) {
        return;
      }

      const { pathname: appPathname } = parseUrl(parsedUrl.appPath);
      const matchedRoute = Object.values($route.routes).find(route => (
        route && route.regexp && appPathname.match(route.regexp)
      ));

      return matchedRoute || $route.routes.null;
    };

    // intercept urls to create unhashed versions of states and ignore redirect only urls which can cause https://github.com/elastic/kibana/pull/13432
    newPlatformNavLinks.setUrlInterceptor(url => {
      const route = getRouteForUrl(url);

      if (route && route.redirectTo) {
        return;
      }

      return unhashUrl(url, getUnhashableStates());
    });

    // filter the current lastUrls to ensure that none of them point to redirecting angular routes, preventing https://github.com/elastic/kibana/pull/13432
    newPlatformNavLinks.filterLastUrls(lastUrl => {
      const route = getRouteForUrl(lastUrl);
      return !route || !route.redirectTo;
    });
  };
}
