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
import sinon from 'sinon';

import { initChromeNavApi } from '../nav';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
import { npStart } from 'ui/new_platform';
import { absoluteToParsedUrl } from '../../../url/absolute_to_parsed_url';

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
  let coreNavLinks;
  let fakedLinks = [];

  const baseUrl = (function () {
    const a = document.createElement('a');
    a.setAttribute('href', '/');
    return a.href.slice(0, a.href.length - 1);
  })();

  beforeEach(() => {
    coreNavLinks = npStart.core.chrome.navLinks;
    sinon.stub(coreNavLinks, 'update').callsFake((linkId, updateAttrs) => {
      const link = fakedLinks.find(({ id }) => id === linkId);
      for (const key of Object.keys(updateAttrs)) {
        link[key] = updateAttrs[key];
      }
      return link;
    });
    sinon.stub(coreNavLinks, 'getAll').callsFake(() => fakedLinks);
    sinon
      .stub(coreNavLinks, 'get')
      .callsFake((linkId) => fakedLinks.find(({ id }) => id === linkId));
  });

  afterEach(() => {
    coreNavLinks.update.restore();
    coreNavLinks.getAll.restore();
    coreNavLinks.get.restore();
  });

  describe('#untrackNavLinksForDeletedSavedObjects', function () {
    const appId = 'appId';
    const appUrl = `${baseUrl}/app/kibana#test`;
    const deletedId = 'IAMDELETED';

    it('should clear last url when last url contains link to deleted saved object', function () {
      const appUrlStore = new StubBrowserStorage();
      fakedLinks = [
        {
          id: appId,
          title: 'Discover',
          url: `${appUrl}?id=${deletedId}`,
          baseUrl: appUrl,
          linkToLastSubUrl: true,
          legacy: true,
        },
      ];

      const { chrome } = init({ appUrlStore });
      chrome.untrackNavLinksForDeletedSavedObjects([deletedId]);
      expect(coreNavLinks.update.calledWith(appId, { url: appUrl })).to.be(true);
    });

    it('should not clear last url when last url does not contains link to deleted saved object', function () {
      const lastUrl = `${appUrl}?id=anotherSavedObjectId`;
      const appUrlStore = new StubBrowserStorage();
      fakedLinks = [
        {
          id: appId,
          title: 'Discover',
          url: lastUrl,
          baseUrl: appUrl,
          linkToLastSubUrl: true,
          legacy: true,
        },
      ];

      const { chrome } = init({ appUrlStore });
      chrome.untrackNavLinksForDeletedSavedObjects([deletedId]);
      expect(coreNavLinks.update.calledWith(appId, { url: appUrl })).to.be(false);
    });
  });

  describe('chrome.trackSubUrlForApp()', function () {
    it('injects a manual app url', function () {
      const appUrlStore = new StubBrowserStorage();
      fakedLinks = [
        {
          id: 'visualize',
          baseUrl: `${baseUrl}/app/visualize#`,
          url: `${baseUrl}/app/visualize#`,
          subUrlBase: '/app/visualize#',
          legacy: true,
        },
      ];

      const { chrome } = init({ appUrlStore });
      const kibanaParsedUrl = absoluteToParsedUrl(
        `${baseUrl}/xyz/app/visualize#/1234?_g=globalstate`,
        '/xyz'
      );
      chrome.trackSubUrlForApp('visualize', kibanaParsedUrl);
      expect(
        coreNavLinks.update.calledWith('visualize', {
          url: `${baseUrl}/xyz/app/visualize#/1234?_g=globalstate`,
        })
      ).to.be(true);
    });
  });
});
