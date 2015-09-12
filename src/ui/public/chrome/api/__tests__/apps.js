let expect = require('expect.js');

let setup = require('../apps');
let TabFakeStore = require('../../__tests__/_TabFakeStore');

describe('Chrome API :: apps', function () {
  describe('#get/setShowAppsLink()', function () {
    describe('defaults to false if there are less than two apps', function () {
      it('appCount = 0', function () {
        let chrome = {};
        setup(chrome, { appCount: 0 });
        expect(chrome.getShowAppsLink()).to.equal(false);
      });

      it('appCount = 1', function () {
        let chrome = {};
        setup(chrome, { appCount: 1 });
        expect(chrome.getShowAppsLink()).to.equal(false);
      });
    });

    describe('defaults to true if there are two or more apps', function () {
      it('appCount = 2', function () {
        let chrome = {};
        setup(chrome, { appCount: 2 });
        expect(chrome.getShowAppsLink()).to.equal(true);
      });

      it('appCount = 3', function () {
        let chrome = {};
        setup(chrome, { appCount: 3 });
        expect(chrome.getShowAppsLink()).to.equal(true);
      });
    });

    it('is chainable', function () {
      let chrome = {};
      setup(chrome, { appCount: 1 });
      expect(chrome.setShowAppsLink(true)).to.equal(chrome);
    });

    it('can be changed', function () {
      let chrome = {};
      setup(chrome, { appCount: 1 });

      expect(chrome.setShowAppsLink(true).getShowAppsLink()).to.equal(true);
      expect(chrome.getShowAppsLink()).to.equal(true);

      expect(chrome.setShowAppsLink(false).getShowAppsLink()).to.equal(false);
      expect(chrome.getShowAppsLink()).to.equal(false);
    });
  });

  describe('#getApp()', function () {
    it('returns a clone of the current app', function () {
      let chrome = {};
      let app = { 1: 2 };
      setup(chrome, { app });

      expect(chrome.getApp()).to.eql(app);
      expect(chrome.getApp()).to.not.equal(app);
    });

    it('returns undefined if no active app', function () {
      let chrome = {};
      setup(chrome, {});
      expect(chrome.getApp()).to.equal(undefined);
    });
  });

  describe('#getAppTitle()', function () {
    it('returns the title property of the current app', function () {
      let chrome = {};
      let app = { title: 'foo' };
      setup(chrome, { app });
      expect(chrome.getAppTitle()).to.eql('foo');
    });

    it('returns undefined if no active app', function () {
      let chrome = {};
      setup(chrome, {});
      expect(chrome.getAppTitle()).to.equal(undefined);
    });
  });

  describe('#getAppUrl()', function () {
    it('returns the url property of the current app', function () {
      let chrome = {};
      let app = { url: 'foo' };
      setup(chrome, { app });
      expect(chrome.getAppUrl()).to.eql('foo');
    });

    it('returns undefined if no active app', function () {
      let chrome = {};
      setup(chrome, {});
      expect(chrome.getAppUrl()).to.equal(undefined);
    });
  });

  describe('#getInjected()', function () {
    describe('called without args', function () {
      it('returns a clone of all injectedVars', function () {
        let chrome = {};
        let vars = { name: 'foo' };
        setup(chrome, { vars });
        expect(chrome.getInjected()).to.eql(vars);
        expect(chrome.getInjected()).to.not.equal(vars);
      });
    });

    describe('called with a var name', function () {
      it('returns the var at that name', function () {
        let chrome = {};
        let vars = { name: 'foo' };
        setup(chrome, { vars });
        expect(chrome.getInjected('name')).to.equal('foo');
      });
    });

    describe('called with a var name and default', function () {
      it('returns the default when the var is undefined', function () {
        let chrome = {};
        let vars = { name: undefined };
        setup(chrome, { vars });
        expect(chrome.getInjected('name', 'bar')).to.equal('bar');
      });

      it('returns null when the var is null', function () {
        let chrome = {};
        let vars = { name: null };
        setup(chrome, { vars });
        expect(chrome.getInjected('name', 'bar')).to.equal(null);
      });

      it('returns var if not undefined', function () {
        let chrome = {};
        let vars = { name: 'kim' };
        setup(chrome, { vars });
        expect(chrome.getInjected('name', 'bar')).to.equal('kim');
      });
    });

    describe('#get/setLastUrlFor()', function () {
      it('reads/writes last url from storage', function () {
        let chrome = {};
        let store = new TabFakeStore();
        setup(chrome, { appUrlStore: store });
        expect(chrome.getLastUrlFor('app')).to.equal(undefined);
        chrome.setLastUrlFor('app', 'url');
        expect(chrome.getLastUrlFor('app')).to.equal('url');
        expect(store.getKeys().length).to.equal(1);
        expect(store.getValues().shift()).to.equal('url');
      });
    });
  });



});
