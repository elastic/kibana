import expect from 'expect.js';
import { indexBy } from 'lodash';

import TabFakeStore from './_utils/TabFakeStore';
import TabCollection from '../TabCollection';
import Tab from '../Tab';

describe.only('Chrome TabCollection', function () {
  describe('empty state', function () {
    it('has no tabs', function () {
      let tabs = new TabCollection();
      expect(tabs.get()).to.eql([]);
    });

    it('has no active tab', function () {
      let tabs = new TabCollection();
      expect(!tabs.getActive()).to.equal(true);
    });
  });

  describe('#set()', function () {
    it('consumes an ordered list of Tab specs', function () {
      let tabs = new TabCollection();
      tabs.set([
        { id: 'foo' },
        { id: 'bar' }
      ]);

      let ts = tabs.get();
      expect(ts.length).to.equal(2);
      expect(ts[0].id).to.equal('foo');
      expect(ts[1].id).to.equal('bar');
    });
  });

  describe('#setDefaults()', function () {
    it('applies the defaults used to create tabs', function () {
      let tabs = new TabCollection();
      tabs.setDefaults({ id: 'thing' });
      tabs.set([ {} ]);

      expect(tabs.get()[0].id).to.equal('thing');
    });

    it('recreates existing tabs with new defaults', function () {
      let tabs = new TabCollection();
      tabs.set([ {} ]);
      expect(!tabs.get()[0].id).to.equal(true);

      tabs.setDefaults({ id: 'thing' });
      expect(tabs.get()[0].id).to.equal('thing');
    });
  });

  describe('#consumeRouteUpdate()', function () {
    it('updates the active tab', function () {
      let store = new TabFakeStore();
      let tabs = new TabCollection({ store });
      tabs.set([
        { id: 'a' },
        { id: 'b' }
      ]);

      tabs.consumeRouteUpdate('app', 'http://localhost:9200/a', '/a');
      let tabById = indexBy(tabs.get(), 'id');
      expect(tabById.a.active).to.equal(true);
      expect(tabById.b.active).to.equal(false);
      expect(tabs.getActive()).to.equal(tabById.a);
    });

    it('updates the last url of each tab with the current global state', function () {
      let store = new TabFakeStore();
      let tabs = new TabCollection({ store });
      tabs.set([
        { id: 'a', trackLastUrl: true },
        { id: 'b', trackLastUrl: true }
      ]);
      let tabById = indexBy(tabs.get(), 'id');

      expect(tabById.a.lastUrl).to.not.match(/_g=1/);
      expect(tabById.b.lastUrl).to.not.match(/_g=1/);
      tabs.consumeRouteUpdate('app', 'http://localhost:9200/a?_g=1', '/a', true);
      expect(tabById.a.lastUrl).to.match(/_g=1/);
      expect(tabById.b.lastUrl).to.match(/_g=1/);
    });

    it('stores the lastUrl for the entire app in a safe place', function () {
      let store = new TabFakeStore();
      let tabs = new TabCollection({ store });
      let url = 'http://localhost:9200/a';
      tabs.consumeRouteUpdate('app', url, '/a');
      expect(store.getItem(`appLastUrl:app`)).to.equal(url);
    });
  });

});
