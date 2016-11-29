import expect from 'expect.js';

import setup from '../apps';
import StubBrowserStorage from 'test_utils/stub_browser_storage';

describe('Chrome API :: apps', function () {
  describe('#get/setShowAppsLink()', function () {
    describe('defaults to false if there are less than two apps', function () {
      it('appCount = 0', function () {
        const chrome = {};
        setup(chrome, { nav: [] });
        expect(chrome.getShowAppsLink()).to.equal(false);
      });

      it('appCount = 1', function () {
        const chrome = {};
        setup(chrome, { nav: [ { url: '/' } ] });
        expect(chrome.getShowAppsLink()).to.equal(false);
      });
    });

    describe('defaults to true if there are two or more apps', function () {
      it('appCount = 2', function () {
        const chrome = {};
        setup(chrome, { nav: [ { url: '/' }, { url: '/2' } ] });
        expect(chrome.getShowAppsLink()).to.equal(true);
      });

      it('appCount = 3', function () {
        const chrome = {};
        setup(chrome, { nav: [ { url: '/' }, { url: '/2' }, { url: '/3' } ] });
        expect(chrome.getShowAppsLink()).to.equal(true);
      });
    });

    it('is chainable', function () {
      const chrome = {};
      setup(chrome, { nav: [ { url: '/' } ] });
      expect(chrome.setShowAppsLink(true)).to.equal(chrome);
    });

    it('can be changed', function () {
      const chrome = {};
      setup(chrome, { nav: [ { url: '/' } ] });

      expect(chrome.setShowAppsLink(true).getShowAppsLink()).to.equal(true);
      expect(chrome.getShowAppsLink()).to.equal(true);

      expect(chrome.setShowAppsLink(false).getShowAppsLink()).to.equal(false);
      expect(chrome.getShowAppsLink()).to.equal(false);
    });
  });

  describe('#getApp()', function () {
    it('returns a clone of the current app', function () {
      const chrome = {};
      const app = { url: '/' };
      setup(chrome, { app });

      expect(chrome.getApp()).to.eql(app);
      expect(chrome.getApp()).to.not.equal(app);
    });

    it('returns undefined if no active app', function () {
      const chrome = {};
      setup(chrome, {});
      expect(chrome.getApp()).to.equal(undefined);
    });
  });

  describe('#getAppTitle()', function () {
    it('returns the title property of the current app', function () {
      const chrome = {};
      const app = { url: '/', title: 'foo' };
      setup(chrome, { app });
      expect(chrome.getAppTitle()).to.eql('foo');
    });

    it('returns undefined if no active app', function () {
      const chrome = {};
      setup(chrome, {});
      expect(chrome.getAppTitle()).to.equal(undefined);
    });
  });

  describe('#getAppUrl()', function () {
    it('returns the resolved url of the current app', function () {
      const chrome = {};
      const app = { navLink: { url: '/foo' } };
      setup(chrome, { app });

      const a = document.createElement('a');
      a.setAttribute('href', app.navLink.url);
      expect(chrome.getAppUrl()).to.equal(a.href);
    });

    it('returns undefined if no active app', function () {
      const chrome = {};
      setup(chrome, {});
      expect(chrome.getAppUrl()).to.equal(undefined);
    });
  });

  describe('#getInjected()', function () {
    describe('called without args', function () {
      it('returns a clone of all injectedVars', function () {
        const chrome = {};
        const vars = { name: 'foo' };
        setup(chrome, { vars });
        expect(chrome.getInjected()).to.eql(vars);
        expect(chrome.getInjected()).to.not.equal(vars);
      });
    });

    describe('called with a var name', function () {
      it('returns the var at that name', function () {
        const chrome = {};
        const vars = { name: 'foo' };
        setup(chrome, { vars });
        expect(chrome.getInjected('name')).to.equal('foo');
      });
    });

    describe('called with a var name and default', function () {
      it('returns the default when the var is undefined', function () {
        const chrome = {};
        const vars = { name: undefined };
        setup(chrome, { vars });
        expect(chrome.getInjected('name', 'bar')).to.equal('bar');
      });

      it('returns null when the var is null', function () {
        const chrome = {};
        const vars = { name: null };
        setup(chrome, { vars });
        expect(chrome.getInjected('name', 'bar')).to.equal(null);
      });

      it('returns var if not undefined', function () {
        const chrome = {};
        const vars = { name: 'kim' };
        setup(chrome, { vars });
        expect(chrome.getInjected('name', 'bar')).to.equal('kim');
      });
    });

    describe('#get/setLastUrlFor()', function () {
      it('reads/writes last url from storage', function () {
        const chrome = {};
        const store = new StubBrowserStorage();
        setup(chrome, { appUrlStore: store });
        expect(chrome.getLastUrlFor('app')).to.equal(null);
        chrome.setLastUrlFor('app', 'url');
        expect(chrome.getLastUrlFor('app')).to.equal('url');
        expect(store.getStubbedKeys().length).to.equal(1);
        expect(store.getStubbedValues().shift()).to.equal('url');
      });
    });
  });



});
