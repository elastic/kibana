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

import setup from '../apps';

describe('Chrome API :: apps', function() {
  describe('#get/setShowAppsLink()', function() {
    describe('defaults to false if there are less than two apps', function() {
      it('appCount = 0', function() {
        const chrome = {};
        setup(chrome, { nav: [] });
        expect(chrome.getShowAppsLink()).to.equal(false);
      });

      it('appCount = 1', function() {
        const chrome = {};
        setup(chrome, { nav: [{ url: '/' }] });
        expect(chrome.getShowAppsLink()).to.equal(false);
      });
    });

    describe('defaults to true if there are two or more apps', function() {
      it('appCount = 2', function() {
        const chrome = {};
        setup(chrome, { nav: [{ url: '/' }, { url: '/2' }] });
        expect(chrome.getShowAppsLink()).to.equal(true);
      });

      it('appCount = 3', function() {
        const chrome = {};
        setup(chrome, { nav: [{ url: '/' }, { url: '/2' }, { url: '/3' }] });
        expect(chrome.getShowAppsLink()).to.equal(true);
      });
    });

    it('is chainable', function() {
      const chrome = {};
      setup(chrome, { nav: [{ url: '/' }] });
      expect(chrome.setShowAppsLink(true)).to.equal(chrome);
    });

    it('can be changed', function() {
      const chrome = {};
      setup(chrome, { nav: [{ url: '/' }] });

      expect(chrome.setShowAppsLink(true).getShowAppsLink()).to.equal(true);
      expect(chrome.getShowAppsLink()).to.equal(true);

      expect(chrome.setShowAppsLink(false).getShowAppsLink()).to.equal(false);
      expect(chrome.getShowAppsLink()).to.equal(false);
    });
  });

  describe('#getApp()', function() {
    it('returns a clone of the current app', function() {
      const chrome = {};
      const app = { url: '/' };
      setup(chrome, { app });

      expect(chrome.getApp()).to.eql(app);
      expect(chrome.getApp()).to.not.equal(app);
    });

    it('returns undefined if no active app', function() {
      const chrome = {};
      setup(chrome, {});
      expect(chrome.getApp()).to.equal(undefined);
    });
  });

  describe('#getAppTitle()', function() {
    it('returns the title property of the current app', function() {
      const chrome = {};
      const app = { url: '/', title: 'foo' };
      setup(chrome, { app });
      expect(chrome.getAppTitle()).to.eql('foo');
    });

    it('returns undefined if no active app', function() {
      const chrome = {};
      setup(chrome, {});
      expect(chrome.getAppTitle()).to.equal(undefined);
    });
  });

  describe('#getAppUrl()', function() {
    it('returns the resolved url of the current app', function() {
      const chrome = {};
      const app = { navLink: { url: '/foo' } };
      setup(chrome, { app });

      const a = document.createElement('a');
      a.setAttribute('href', app.navLink.url);
      expect(chrome.getAppUrl()).to.equal(a.href);
    });

    it('returns undefined if no active app', function() {
      const chrome = {};
      setup(chrome, {});
      expect(chrome.getAppUrl()).to.equal(undefined);
    });
  });
});
