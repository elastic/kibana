let Tab = require('../Tab');
let expect = require('expect.js');
let TabFakeStore = require('./_utils/TabFakeStore');

describe('Chrome Tab', function () {
  describe('construction', function () {
    it('accepts id, title, resetWhenActive, trackLastUrl, activeIndicatorColor', function () {
      let tab = new Tab({
        id: 'foo',
        title: 'Foo App',
        resetWhenActive: false,
        trackLastUrl: true,
        activeIndicatorColor: true
      });

      expect(tab.id).to.equal('foo');
      expect(tab.title).to.equal('Foo App');
      expect(tab.resetWhenActive).to.equal(false);
      expect(tab.trackLastUrl).to.equal(true);
      expect(tab.activeIndicatorColor).to.equal(true);

      tab = new Tab({
        id: 'bar',
        title: 'Bar App',
        resetWhenActive: true,
        trackLastUrl: false,
        activeIndicatorColor: false
      });

      expect(tab.id).to.equal('bar');
      expect(tab.title).to.equal('Bar App');
      expect(tab.resetWhenActive).to.equal(true);
      expect(tab.trackLastUrl).to.equal(false);
      expect(tab.activeIndicatorColor).to.equal(null);
    });

    it('starts inactive', function () {
      let tab = new Tab();
      expect(tab.active).to.equal(false);
    });

    it('uses the id to set the rootUrl', function () {
      let id = 'foo';
      let tab = new Tab({ id });
      expect(tab.id).to.equal(id);
      expect(tab.rootUrl).to.equal(`/${id}`);
    });

    it('creates a regexp for matching the rootUrl', function () {
      let tab = new Tab({ id: 'foo' });

      expect('/foo').to.match(tab.rootRegExp);
      expect('/foo/bar').to.match(tab.rootRegExp);
      expect('/foo/bar/max').to.match(tab.rootRegExp);
      expect('/foo?bar=baz').to.match(tab.rootRegExp);
      expect('/foo/?bar=baz').to.match(tab.rootRegExp);
      expect('/foo#?bar=baz').to.match(tab.rootRegExp);

      expect('/foobar').to.not.match(tab.rootRegExp);
      expect('site.com/foo#?bar=baz').to.not.match(tab.rootRegExp);
      expect('http://site.com/foo#?bar=baz').to.not.match(tab.rootRegExp);
    });

    it('accepts a function for activeIndicatorColor', function () {
      let i = 0;
      let tab = new Tab({
        activeIndicatorColor: function () {
          return i++;
        }
      });
      expect(tab.activeIndicatorColor).to.equal(0);
      expect(tab.activeIndicatorColor).to.equal(1);
      expect(tab.activeIndicatorColor).to.equal(2);
      expect(tab.activeIndicatorColor).to.equal(3);
    });

    it('discovers the lastUrl', function () {
      let store = new TabFakeStore();
      let tab = new Tab({ id: 'foo', trackLastUrl: true, store });
      expect(tab.lastUrl).to.not.equal('bar');

      tab.persistLastUrl('bar');
      expect(tab.lastUrl).to.equal('bar');

      tab = new Tab({ id: 'foo', trackLastUrl: true, store });
      expect(tab.lastUrl).to.equal('bar');
    });
  });


  describe('#persistLastUrl', function () {
    it('updates the lastUrl and storage value if trackLastUrl:true', function () {
      let store = new TabFakeStore();
      let tab = new Tab({ id: 'foo', trackLastUrl: true, store });

      tab.lastUrl = null;
      tab.persistLastUrl('foo');
      expect(tab.lastUrl).to.equal('foo');
      expect(store.getItem(tab.lastUrlStoreKey)).to.equal('foo');
    });

    it('is noop if trackLastUrl:false', function () {
      let store = new TabFakeStore();
      let tab = new Tab({ id: 'foo', trackLastUrl: false, store });

      expect(tab.lastUrl).to.equal(undefined);
      tab.persistLastUrl('foo');
      expect(tab.lastUrl).to.equal(null);
      expect(store.getItem(tab.lastUrlStoreKey)).to.equal(undefined);
    });
  });


  describe('#href', function () {
    it('returns the rootUrl/id be default', function () {
      let tab = new Tab({ id: 'foo' });
      expect(tab.href()).to.equal(tab.rootUrl);
    });

    it('returns the lastUrl if tracking is on', function () {
      let store = new TabFakeStore();
      let tab = new Tab({ id: 'foo', trackLastUrl: true, store });
      tab.persistLastUrl('okay');

      expect(tab.href()).to.equal('okay');
    });

    describe('when the tab is active', function () {
      it('returns the rootUrl when resetWhenActive: true', function () {
        let store = new TabFakeStore();
        let tab = new Tab({ id: 'foo', resetWhenActive: true, store });
        tab.active = true;

        expect(tab.href()).to.not.equal('butt');
        expect(tab.href()).to.equal(tab.rootUrl);
      });

      it('or returns undefined when not', function () {
        let store = new TabFakeStore();
        let tab = new Tab({ id: 'foo', resetWhenActive: false, store });
        tab.active = true;

        expect(tab.href()).to.not.equal('butt');
        expect(tab.href()).to.equal(tab.rootUrl);
      });
    });
  });
});
