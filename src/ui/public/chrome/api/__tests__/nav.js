import expect from 'expect.js';

import { initChromeNavApi } from 'ui/chrome/api/nav';
import StubBrowserStorage from 'test_utils/stub_browser_storage';

const basePath = '/someBasePath';

function init(customInternals = { basePath }) {
  const chrome = {};
  const internals = {
    nav: [],
    ...customInternals,
  };
  initChromeNavApi(chrome, internals);
  return { chrome, internals };
}

describe('chrome nav apis', function () {
  describe('#getBasePath()', function () {
    it('returns the basePath', function () {
      const { chrome } = init();
      expect(chrome.getBasePath()).to.be(basePath);
    });
  });

  describe('#addBasePath()', function () {
    it('returns undefined when nothing is passed', function () {
      const { chrome } = init();
      expect(chrome.addBasePath()).to.be(undefined);
    });

    it('prepends the base path when the input is a path', function () {
      const { chrome } = init();
      expect(chrome.addBasePath('/other/path')).to.be(`${basePath}/other/path`);
    });

    it('ignores non-path urls', function () {
      const { chrome } = init();
      expect(chrome.addBasePath('http://github.com/elastic/kibana')).to.be('http://github.com/elastic/kibana');
    });

    it('includes the query string', function () {
      const { chrome } = init();
      expect(chrome.addBasePath('/app/kibana?a=b')).to.be(`${basePath}/app/kibana?a=b`);
    });
  });

  describe('#removeBasePath', () => {
    it ('returns the given URL as-is when no basepath is set', () => {
      const basePath = '';
      const { chrome } = init({ basePath });
      expect(chrome.removeBasePath('/app/kibana?a=b')).to.be('/app/kibana?a=b');
    });

    it ('returns the given URL with the basepath stripped out when basepath is set', () => {
      const { chrome } = init();
      expect(chrome.removeBasePath(`${basePath}/app/kibana?a=b`)).to.be('/app/kibana?a=b');
    });
  });

  describe('#getNavLinkById', () => {
    it ('retrieves the correct nav link, given its ID', () => {
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

    it ('throws an error if the nav link with the given ID is not found', () => {
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
});
