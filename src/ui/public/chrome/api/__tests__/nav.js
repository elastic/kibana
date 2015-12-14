import expect from 'expect.js';

import initChromeNavApi from 'ui/chrome/api/nav';

const basePath = '/someBasePath';

function getChrome(customInternals = { basePath }) {
  const chrome = {};
  initChromeNavApi(chrome, {
    nav: [],
    ...customInternals,
  });
  return chrome;
}

describe('chrome nav apis', function () {
  describe('#getBasePath()', function () {
    it('returns the basePath', function () {
      const chrome = getChrome();
      expect(chrome.getBasePath()).to.be(basePath);
    });
  });

  describe('#addBasePath()', function () {
    it('returns undefined when nothing is passed', function () {
      const chrome = getChrome();
      expect(chrome.addBasePath()).to.be(undefined);
    });

    it('prepends the base path when the input is a path', function () {
      const chrome = getChrome();
      expect(chrome.addBasePath('/other/path')).to.be(`${basePath}/other/path`);
    });

    it('ignores non-path urls', function () {
      const chrome = getChrome();
      expect(chrome.addBasePath('http://github.com/elastic/kibana')).to.be('http://github.com/elastic/kibana');
    });
  });
});
