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
import { mapTo } from 'rxjs/operators';
import { remove } from 'lodash';
import { relativeToAbsolute } from '../../url/relative_to_absolute';
import { absoluteToParsedUrl } from '../../url/absolute_to_parsed_url';

export function initChromeNavApi(chrome, internals) {
  const navUpdate$ = new Rx.BehaviorSubject(undefined);

  chrome.getNavLinks = function () {
    return internals.nav;
  };

  chrome.getNavLinks$ = function () {
    return navUpdate$.pipe(mapTo(internals.nav));
  };

  // track navLinks with $rootScope.$watch like the old nav used to, necessary
  // as long as random parts of the app are directly mutating the navLinks
  internals.$initNavLinksDeepWatch = function ($rootScope) {
    $rootScope.$watch(
      () => internals.nav,
      () => navUpdate$.next(),
      true
    );
  };


  const forceAppSwitcherNavigation$ = new Rx.BehaviorSubject(false);
  /**
   * Enable forced navigation mode, which will trigger a page refresh
   * when a nav link is clicked and only the hash is updated. This is only
   * necessary when rendering the status page in place of another app, as
   * links to that app will set the current URL and change the hash, but
   * the routes for the correct are not loaded so nothing will happen.
   * https://github.com/elastic/kibana/pull/29770
   */
  chrome.enableForcedAppSwitcherNavigation = () => {
    forceAppSwitcherNavigation$.next(true);
    return chrome;
  };
  chrome.getForceAppSwitcherNavigation$ = () => {
    return forceAppSwitcherNavigation$.asObservable();
  };

  chrome.navLinkExists = (id) => {
    return !!internals.nav.find(link => link.id === id);
  };

  chrome.getNavLinkById = (id) => {
    const navLink = internals.nav.find(link => link.id === id);
    if (!navLink) {
      throw new Error(`Nav link for id = ${id} not found`);
    }
    return navLink;
  };

  chrome.showOnlyById = (id) => {
    remove(internals.nav, app => app.id !== id);
  };

  function lastSubUrlKey(link) {
    return `lastSubUrl:${link.url}`;
  }

  function setLastUrl(link, url) {
    if (link.linkToLastSubUrl === false) {
      return;
    }

    link.lastSubUrl = url;
    internals.appUrlStore.setItem(lastSubUrlKey(link), url);
  }

  function refreshLastUrl(link) {
    link.lastSubUrl = internals.appUrlStore.getItem(lastSubUrlKey(link)) || link.lastSubUrl || link.url;
  }

  function injectNewGlobalState(link, fromAppId, newGlobalState) {
    const kibanaParsedUrl = absoluteToParsedUrl(link.lastSubUrl, chrome.getBasePath());

    // don't copy global state if links are for different apps
    if (fromAppId !== kibanaParsedUrl.appId) return;

    kibanaParsedUrl.setGlobalState(newGlobalState);

    link.lastSubUrl = kibanaParsedUrl.getAbsoluteUrl();
  }

  /**
   * Clear last url for deleted saved objects to avoid loading pages with "Could not locate.."
   */
  chrome.untrackNavLinksForDeletedSavedObjects = (deletedIds) => {
    function urlContainsDeletedId(url) {
      const includedId = deletedIds.find(deletedId => {
        return url.includes(deletedId);
      });
      if (includedId === undefined) {
        return false;
      }
      return true;
    }

    internals.nav.forEach(link => {
      if (link.linkToLastSubUrl && urlContainsDeletedId(link.lastSubUrl)) {
        setLastUrl(link, link.url);
      }
    });
  };

  /**
   * Manually sets the last url for the given app. The last url for a given app is updated automatically during
   * normal page navigation, so this should only need to be called to insert a last url that was not actually
   * navigated to. For instance, when saving an object and redirecting to another page, the last url of the app
   * should be the saved instance, but because of the redirect to a different page (e.g. `Save and Add to Dashboard`
   * on visualize tab), it won't be tracked automatically and will need to be inserted manually. See
   * https://github.com/elastic/kibana/pull/11932 for more background on why this was added.
   * @param linkId {String} - an id that represents the navigation link.
   * @param kibanaParsedUrl {KibanaParsedUrl} the url to track
   */
  chrome.trackSubUrlForApp = (linkId, kibanaParsedUrl) => {
    for (const link of internals.nav) {
      if (link.id === linkId) {
        const absoluteUrl = kibanaParsedUrl.getAbsoluteUrl();
        setLastUrl(link, absoluteUrl);
        return;
      }
    }
  };

  internals.trackPossibleSubUrl = function (url) {
    const kibanaParsedUrl = absoluteToParsedUrl(url, chrome.getBasePath());

    for (const link of internals.nav) {
      link.active = url.startsWith(link.subUrlBase);
      if (link.active) {
        setLastUrl(link, url);
        continue;
      }

      refreshLastUrl(link);

      const newGlobalState = kibanaParsedUrl.getGlobalState();
      if (newGlobalState) {
        injectNewGlobalState(link, kibanaParsedUrl.appId, newGlobalState);
      }
    }
  };

  internals.nav.forEach(link => {
    link.url = relativeToAbsolute(chrome.addBasePath(link.url));
    link.subUrlBase = relativeToAbsolute(chrome.addBasePath(link.subUrlBase));
  });

  // simulate a possible change in url to initialize the
  // link.active and link.lastUrl properties
  internals.trackPossibleSubUrl(document.location.href);
}
