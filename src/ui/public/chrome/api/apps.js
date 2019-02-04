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

import { clone, get } from 'lodash';
import { resolve } from 'url';

// eslint-disable-next-line @elastic/kibana-custom/no-default-export
export default function (chrome, internals) {

  if (get(internals, 'app.navLink.url')) {
    internals.app.navLink.url = resolve(window.location.href, internals.app.navLink.url);
  }

  internals.appUrlStore = internals.appUrlStore || window.sessionStorage;
  try {
    const verifySessionStorage = 'verify sessionStorage';
    internals.appUrlStore.setItem(verifySessionStorage, 1);
    internals.appUrlStore.removeItem(verifySessionStorage);
  } catch (error) {
    throw new Error(
      'Kibana requires access to sessionStorage, and it looks like ' +
      'your browser is restricting it. If you\'re ' +
      'using Safari with private browsing enabled, you can solve this ' +
      'problem by disabling private browsing, or by using another browser.');
  }

  /**
   * ui/chrome apps API
   *
   *   ui/chrome has some metadata about the current app, and enables the
   *   navbar link, a small grid to the left of the tabs, when there is more
   *   than one app installed.
   */

  chrome.setShowAppsLink = function (val) {
    internals.showAppsLink = !!val;
    return chrome;
  };

  chrome.getShowAppsLink = function () {
    return internals.showAppsLink == null ? internals.nav.length > 1 : internals.showAppsLink;
  };

  chrome.getKibanaVersion = function () {
    return internals.version;
  };

  chrome.getApp = function () {
    return clone(internals.app);
  };

  chrome.getAppTitle = function () {
    return get(internals, ['app', 'title']);
  };

  chrome.getAppUrl = function () {
    return get(internals, ['app', 'navLink', 'url']);
  };

  chrome.getLastUrlFor = function (appId) {
    return internals.appUrlStore.getItem(`appLastUrl:${appId}`);
  };

  chrome.setLastUrlFor = function (appId, url) {
    internals.appUrlStore.setItem(`appLastUrl:${appId}`, url);
  };
}
