const Tab = require('../Tab');
const expect = require('expect.js');
const StubBrowserStorage = require('testUtils/stub_browser_storage');

describe('Chrome Tab', function () {
  describe('construction', function () {
    it('accepts id, title, resetWhenActive, trackLastUrl, activeIndicatorColor, baseUrl', function () {
      const tab = new Tab({
        id: 'foo',
        title: 'Foo App',
        resetWhenActive: false,
        activeIndicatorColor: true,
        baseUrl: 'proto:host.domain:999'
      });

      expect(tab.id).to.equal('foo');
      expect(tab.title).to.equal('Foo App');
      expect(tab.resetWhenActive).to.equal(false);
      expect(tab.activeIndicatorColor).to.equal(true);
      expect(tab.rootUrl).to.equal('proto:host.domain:999/foo');

      const tab2 = new Tab({
        id: 'bar',
        title: 'Bar App',
        resetWhenActive: true,
        activeIndicatorColor: false,
        baseUrl: 'proto:host.domain:999/sub/#/'
      });

      expect(tab2.id).to.equal('bar');
      expect(tab2.title).to.equal('Bar App');
      expect(tab2.resetWhenActive).to.equal(true);
      expect(tab2.activeIndicatorColor).to.equal(null);
      expect(tab2.rootUrl).to.equal('proto:host.domain:999/sub/#/bar');
    });

    it('starts inactive', function () {
      const tab = new Tab();
      expect(tab.active).to.equal(false);
    });

    it('uses the id to set the rootUrl', function () {
      const id = 'foo';
      const tab = new Tab({ id });
      expect(tab.id).to.equal(id);
      expect(tab.rootUrl).to.equal(`/${id}`);
    });

    it('creates a regexp for matching the rootUrl', function () {
      const tab = new Tab({ id: 'foo' });

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

    it('includes the baseUrl in the rootRegExp if specified', function () {
      const tab = new Tab({
        id: 'foo',
        baseUrl: 'http://spiderman.com/kibana'
      });

      expect('http://spiderman.com/kibana/foo/bar').to.match(tab.rootRegExp);

      expect('/foo').to.not.match(tab.rootRegExp);
      expect('https://spiderman.com/kibana/foo/bar').to.not.match(tab.rootRegExp);
    });

    it('accepts a function for activeIndicatorColor', function () {
      let i = 0;
      const tab = new Tab({
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
      const lastUrlStore = new StubBrowserStorage();
      const tab = new Tab({ id: 'foo', lastUrlStore });
      expect(tab.lastUrl).to.not.equal('bar');

      tab.setLastUrl('bar');
      expect(tab.lastUrl).to.equal('bar');

      const tab2 = new Tab({ id: 'foo', lastUrlStore });
      expect(tab2.lastUrl).to.equal('bar');
    });
  });


  describe('#setLastUrl()', function () {
    it('updates the lastUrl and storage value if passed a lastUrlStore', function () {
      const lastUrlStore = new StubBrowserStorage();
      const tab = new Tab({ id: 'foo', lastUrlStore });

      expect(tab.lastUrl).to.not.equal('foo');
      tab.setLastUrl('foo');
      expect(tab.lastUrl).to.equal('foo');
      expect(lastUrlStore.getItem(tab.lastUrlStoreKey)).to.equal('foo');
    });

    it('only updates lastUrl if no lastUrlStore', function () {
      const tab = new Tab({ id: 'foo' });

      expect(tab.lastUrl).to.equal(null);
      tab.setLastUrl('foo');
      expect(tab.lastUrl).to.equal('foo');

      const tab2 = new Tab({ id: 'foo' });
      expect(tab2.lastUrl).to.not.equal('foo');
    });
  });


  describe('#href()', function () {
    it('returns the rootUrl/id be default', function () {
      const tab = new Tab({ id: 'foo' });
      expect(tab.href()).to.equal(tab.rootUrl);
    });

    it('returns the lastUrl if tracking is on', function () {
      const tab = new Tab({ id: 'foo' });
      tab.setLastUrl('okay');
      expect(tab.href()).to.equal('okay');
    });

    describe('when the tab is active', function () {
      it('returns the rootUrl when resetWhenActive: true', function () {
        const id = 'foo';
        const resetWhenActive = true;
        const tab = new Tab({ id, resetWhenActive });

        tab.active = true;

        expect(tab.href()).to.not.equal('butt');
        expect(tab.href()).to.equal(tab.rootUrl);
      });

      it('or returns null when not', function () {
        const tab = new Tab({ id: 'foo', resetWhenActive: false });
        tab.active = true;

        expect(tab.href()).to.not.equal('butt');
        expect(tab.href()).to.equal(null);
      });
    });
  });

  describe('#getLastPath()', function () {
    it('parses a path out of the lastUrl by removing the baseUrl', function () {
      const baseUrl = 'http://local:5601/app/visualize#';
      const tab = new Tab({ baseUrl });

      tab.setLastUrl('http://local:5601/app/visualize#/index');
      expect(tab.getLastPath()).to.equal('/index');
    });

    it('throws an error if the lastUrl does not extend the root url', function () {
      expect(function () {
        const baseUrl = 'http://local:5601/app/visualize#';
        const tab = new Tab({ baseUrl });

        tab.setLastUrl('http://local:5601/');
        tab.getLastPath();
      }).to.throwError(/invalid.*root/);
    });
  });

  describe('updateLastUrlGlobalState', function () {
    const bases = [
      'http://local:5601',
      '',
      'weird.domain/with/subpath?path#',
      'weird.domain/with/#hashpath',
    ];

    context('with new state sets _g properly', function () {
      const paths = [
        [ '/', '/?_g=newState' ],
        [ '/?first', '/?first=&_g=newState' ],
        [ '/path?first=1&_g=afterHash', '/path?first=1&_g=newState' ],
        [ '/?first=1&_g=second', '/?first=1&_g=newState' ],
        [ '/?g=first', '/?g=first&_g=newState' ],
        [ '/a?first=1&_g=second', '/a?first=1&_g=newState' ],
        [ '/?first=1&_g=second', '/?first=1&_g=newState' ],
        [ '/?first&g=second', '/?first=&g=second&_g=newState' ],
      ];

      bases.forEach(baseUrl => {
        paths.forEach(([pathFrom, pathTo]) => {
          const fromUrl = `${baseUrl}${pathFrom}`;
          const toUrl = `${baseUrl}${pathTo}`;
          it(`${fromUrl} => ${toUrl}`, function () {
            const tab = new Tab({ baseUrl });
            tab.setLastUrl(fromUrl);
            tab.updateLastUrlGlobalState('newState');
            expect(tab.getLastUrl()).to.equal(toUrl);
          });
        });
      });
    });

    context('with new empty state removes _g', function () {
      const paths = [
        [ '/', '/' ],
        [ '/?first', '/?first=' ],
        [ '/path?first=1&_g=afterHash', '/path?first=1' ],
        [ '/?first=1&_g=second', '/?first=1' ],
        [ '/?g=first', '/?g=first' ],
        [ '/a?first=1&_g=second', '/a?first=1' ],
        [ '/?first=1&_g=second', '/?first=1' ],
        [ '/?first&g=second', '/?first=&g=second' ],
      ];

      bases.forEach(baseUrl => {
        paths.forEach(([pathFrom, pathTo]) => {
          const fromUrl = `${baseUrl}${pathFrom}`;
          const toUrl = `${baseUrl}${pathTo}`;
          it(`${fromUrl}`, function () {
            const tab = new Tab({ baseUrl });
            tab.setLastUrl(fromUrl);
            tab.updateLastUrlGlobalState();
            expect(tab.getLastUrl()).to.equal(toUrl);
          });
        });
      });
    });
  });
});
