let expect = require('expect.js');
let { indexBy, random } = require('lodash');

let TabFakeStore = require('./_TabFakeStore');
let TabCollection = require('../TabCollection');
let Tab = require('../Tab');

describe('Chrome TabCollection', function () {
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
      let baseUrl = `http://localhost:${random(1000, 9999)}`;
      let tabs = new TabCollection({ store, defaults: { baseUrl } });
      tabs.set([
        { id: 'a' },
        { id: 'b' }
      ]);

      tabs.consumeRouteUpdate(`${baseUrl}/a`);
      let {a, b} = indexBy(tabs.get(), 'id');
      expect(a.active).to.equal(true);
      expect(b.active).to.equal(false);
      expect(tabs.getActive()).to.equal(a);
    });
  });

});
