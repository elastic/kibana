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

import { KibanaParsedUrl } from 'ui/url/kibana_parsed_url';
import { absoluteToParsedUrl } from '../../url/absolute_to_parsed_url';
import { npStart } from '../../new_platform';
import { ChromeNavLink } from '../../../../../core/public';
import { relativeToAbsolute } from '../../url/relative_to_absolute';

export interface ChromeNavLinks {
  untrackNavLinksForDeletedSavedObjects(deletedIds: string[]): void;
  trackSubUrlForApp(linkId: string, parsedKibanaUrl: KibanaParsedUrl): void;
}

interface NavInternals {
  appUrlStore: Storage;
  trackPossibleSubUrl(url: string): void;
}

export function initChromeNavApi(chrome: any, internals: NavInternals) {
  const coreNavLinks = npStart.core.chrome.navLinks;

  /**
   * Clear last url for deleted saved objects to avoid loading pages with "Could not locate..."
   */
  chrome.untrackNavLinksForDeletedSavedObjects = (deletedIds: string[]) => {
    function urlContainsDeletedId(url: string) {
      const includedId = deletedIds.find((deletedId) => {
        return url.includes(deletedId);
      });
      return includedId !== undefined;
    }

    coreNavLinks.getAll().forEach((link) => {
      if (link.linkToLastSubUrl && urlContainsDeletedId(link.url!)) {
        setLastUrl(link, link.baseUrl);
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
   *
   * @param id {String} - an id that represents the navigation link.
   * @param kibanaParsedUrl {KibanaParsedUrl} the url to track
   */
  chrome.trackSubUrlForApp = (id: string, kibanaParsedUrl: KibanaParsedUrl) => {
    const navLink = coreNavLinks.get(id);
    if (navLink) {
      setLastUrl(navLink, kibanaParsedUrl.getAbsoluteUrl());
    }
  };

  internals.trackPossibleSubUrl = async function (url: string) {
    const kibanaParsedUrl = absoluteToParsedUrl(url, chrome.getBasePath());

    coreNavLinks
      .getAll()
      // Filter only legacy links
      .filter((link) => link.legacy && !link.disableSubUrlTracking)
      .forEach((link) => {
        const active = url.startsWith(link.subUrlBase!);
        link = coreNavLinks.update(link.id, { active })!;

        if (active) {
          setLastUrl(link, url);
          return;
        }

        link = refreshLastUrl(link);

        const newGlobalState = kibanaParsedUrl.getGlobalState();
        if (newGlobalState) {
          injectNewGlobalState(link, kibanaParsedUrl.appId, newGlobalState);
        }
      });
  };

  function lastSubUrlKey(link: ChromeNavLink) {
    return `lastSubUrl:${link.baseUrl}`;
  }

  function getLastUrl(link: ChromeNavLink) {
    return internals.appUrlStore.getItem(lastSubUrlKey(link));
  }

  function setLastUrl(link: ChromeNavLink, url: string) {
    if (link.linkToLastSubUrl === false) {
      return;
    }

    internals.appUrlStore.setItem(lastSubUrlKey(link), url);
    refreshLastUrl(link);
  }

  function refreshLastUrl(link: ChromeNavLink) {
    const lastSubUrl = getLastUrl(link);

    return coreNavLinks.update(link.id, {
      url: lastSubUrl || link.url || link.baseUrl,
    })!;
  }

  function injectNewGlobalState(
    link: ChromeNavLink,
    fromAppId: string,
    newGlobalState: string | string[]
  ) {
    const kibanaParsedUrl = absoluteToParsedUrl(
      getLastUrl(link) || link.url || link.baseUrl,
      chrome.getBasePath()
    );

    // don't copy global state if links are for different apps
    if (fromAppId !== kibanaParsedUrl.appId) return;

    kibanaParsedUrl.setGlobalState(newGlobalState);

    coreNavLinks.update(link.id, {
      url: kibanaParsedUrl.getAbsoluteUrl(),
    });
  }

  // simulate a possible change in url to initialize the
  // link.active and link.lastUrl properties
  coreNavLinks
    .getAll()
    .filter((link) => link.subUrlBase && !link.disableSubUrlTracking)
    .forEach((link) => {
      coreNavLinks.update(link.id, {
        subUrlBase: relativeToAbsolute(chrome.addBasePath(link.subUrlBase)),
      });
    });

  internals.trackPossibleSubUrl(document.location.href);
}
