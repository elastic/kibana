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

import expect from '@kbn/expect';

import { initChromeNavApi } from '../nav';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
import { KibanaParsedUrl } from '../../../url/kibana_parsed_url';

const basePath = '/someBasePath';

function init(customInternals = { basePath }) {
  const chrome = {
    addBasePath: (path) => path,
    getBasePath: () => customInternals.basePath || '',
  };
  const internals = {
    nav: [],
    ...customInternals,
  };
  initChromeNavApi(chrome, internals);
  return { chrome, internals };
}

describe('chrome nav apis', function () {
  describe('#getNavLinkById', () => {
    it('retrieves the correct nav link, given its ID', () => {
      const appUrlStore = new StubBrowserStorage();
      const nav = [
        { id: 'kibana:discover', title: 'Discover' }
      ];
      const {
        chrome
      } = init({ appUrlStore, nav });

      const navLink = chrome.getNavLinkById('kibana:discover');
      expect(navLink).to.eql(nav[0]);
    });

    it('throws an error if the nav link with the given ID is not found', () => {
      const appUrlStore = new StubBrowserStorage();
      const nav = [
        { id: 'kibana:discover', title: 'Discover' }
      ];
      const {
        chrome
      } = init({ appUrlStore, nav });

      let errorThrown = false;
      try {
        chrome.getNavLinkById('nonexistent');
      } catch (e) {
        errorThrown = true;
      }
      expect(errorThrown).to.be(true);
    });
  });

  describe('#untrackNavLinksForDeletedSavedObjects', function () {
    const appId = 'appId';
    const appUrl = 'https://localhost:9200/app/kibana#test';
    const deletedId = 'IAMDELETED';

    it('should clear last url when last url contains link to deleted saved object', function () {
      const appUrlStore = new StubBrowserStorage();
      const nav = [
        {
          id: appId,
          title: 'Discover',
          linkToLastSubUrl: true,
          lastSubUrl: `${appUrl}?id=${deletedId}`,
          url: appUrl
        }
      ];
      const {
        chrome
      } = init({ appUrlStore, nav });

      chrome.untrackNavLinksForDeletedSavedObjects([deletedId]);
      expect(chrome.getNavLinkById('appId').lastSubUrl).to.be(appUrl);
    });

    it('should not clear last url when last url does not contains link to deleted saved object', function () {
      const lastUrl = `${appUrl}?id=anotherSavedObjectId`;
      const appUrlStore = new StubBrowserStorage();
      const nav = [
        {
          id: appId,
          title: 'Discover',
          linkToLastSubUrl: true,
          lastSubUrl: lastUrl,
          url: appUrl
        }
      ];
      const {
        chrome
      } = init({ appUrlStore, nav });

      chrome.untrackNavLinksForDeletedSavedObjects([deletedId]);
      expect(chrome.getNavLinkById(appId).lastSubUrl).to.be(lastUrl);
    });
  });

  describe('internals.trackPossibleSubUrl()', function () {
    it('injects the globalState of the current url to all links for the same app', function () {
      const appUrlStore = new StubBrowserStorage();
      const nav = [
        {
          url: 'https://localhost:9200/app/kibana#discover',
          subUrlBase: 'https://localhost:9200/app/kibana#discover'
        },
        {
          url: 'https://localhost:9200/app/kibana#visualize',
          subUrlBase: 'https://localhost:9200/app/kibana#visualize'
        },
        {
          url: 'https://localhost:9200/app/kibana#dashboards',
          subUrlBase: 'https://localhost:9200/app/kibana#dashboard'
        },
      ].map(l => {
        l.lastSubUrl = l.url;
        return l;
      });

      const {
        internals
      } = init({ appUrlStore, nav });

      internals.trackPossibleSubUrl('https://localhost:9200/app/kibana#dashboard?_g=globalstate');
      expect(internals.nav[0].lastSubUrl).to.be('https://localhost:9200/app/kibana#discover?_g=globalstate');
      expect(internals.nav[0].active).to.be(false);

      expect(internals.nav[1].lastSubUrl).to.be('https://localhost:9200/app/kibana#visualize?_g=globalstate');
      expect(internals.nav[1].active).to.be(false);

      expect(internals.nav[2].lastSubUrl).to.be('https://localhost:9200/app/kibana#dashboard?_g=globalstate');
      expect(internals.nav[2].active).to.be(true);
    });
  });

  describe('internals.trackSubUrlForApp()', function () {
    it('injects a manual app url', function () {
      const appUrlStore = new StubBrowserStorage();
      const nav = [
        {
          id: 'kibana:visualize',
          url: 'https://localhost:9200/app/kibana#visualize',
          lastSubUrl: 'https://localhost:9200/app/kibana#visualize',
          subUrlBase: 'https://localhost:9200/app/kibana#visualize'
        }
      ];

      const { chrome, internals } = init({ appUrlStore, nav });

      const basePath = '/xyz';
      const appId = 'kibana';
      const appPath = 'visualize/1234?_g=globalstate';
      const hostname = 'localhost';
      const port = '9200';
      const protocol = 'https';

      const kibanaParsedUrl = new KibanaParsedUrl({ basePath, appId, appPath, hostname, port, protocol });
      chrome.trackSubUrlForApp('kibana:visualize', kibanaParsedUrl);
      expect(internals.nav[0].lastSubUrl).to.be('https://localhost:9200/xyz/app/kibana#visualize/1234?_g=globalstate');
    });
  });
});
