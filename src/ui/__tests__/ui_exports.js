import expect from 'expect.js';

import UiExports from '../ui_exports';

describe('UiExports', function () {
  describe('#find()', function () {
    it('finds exports based on the passed export names', function () {
      var uiExports = new UiExports({});
      uiExports.aliases.foo = ['a', 'b', 'c'];
      uiExports.aliases.bar = ['d', 'e', 'f'];

      expect(uiExports.find(['foo'])).to.eql(['a', 'b', 'c']);
      expect(uiExports.find(['bar'])).to.eql(['d', 'e', 'f']);
      expect(uiExports.find(['foo', 'bar'])).to.eql(['a', 'b', 'c', 'd', 'e', 'f']);
    });

    it('allows query types that match nothing', function () {
      var uiExports = new UiExports({});
      uiExports.aliases.foo = ['a', 'b', 'c'];

      expect(uiExports.find(['foo'])).to.eql(['a', 'b', 'c']);
      expect(uiExports.find(['bar'])).to.eql([]);
      expect(uiExports.find(['foo', 'bar'])).to.eql(['a', 'b', 'c']);
    });
  });

  describe('#resolveModulePath()', function () {
    context('path that starts with ./', function () {
      it('joins with "plugins/{plugin.id}"', function () {
        const uiExports = new UiExports({});
        const plugin = { id: 'someplugin' };
        const resolved = uiExports.resolveModulePath(plugin, './relative.js');
        expect(resolved).to.be('plugins/someplugin/relative.js');
      });
    });

    context(`path doesn't starts with ./`, function () {
      it('leaves it alone', function () {
        const uiExports = new UiExports({});
        const plugin = { id: 'someplugin' };
        expect(uiExports.resolveModulePath(plugin, 'file.js')).to.be('file.js');
        expect(uiExports.resolveModulePath(plugin, 'moment')).to.be('moment');
        expect(uiExports.resolveModulePath(plugin, 'plugins/id/file.js')).to.be('plugins/id/file.js');
      });
    });
  });

  describe('#extendAliases()', function () {
    context('first alias of type', function () {
      context('string id', function () {
        it('creates a new array containing the id', function () {
          const uiExports = new UiExports({});
          const plugin = { id: 'someplugin' };
          uiExports.extendAliases(plugin, 'type', 'file.js');
          expect(uiExports.aliases.type).to.eql(['file.js']);
        });
      });

      context('array id', function () {
        it('creates a new array, merges the array', function () {
          const uiExports = new UiExports({});
          const plugin = { id: 'someplugin' };
          const ids = ['file.js', './say.js'];
          uiExports.extendAliases(plugin, 'type', ids);
          expect(uiExports.aliases.type).to.eql(['file.js', 'plugins/someplugin/say.js']);
          expect(uiExports.aliases.type).to.not.be(ids);
        });
      });
    });

    context('additional alias of type', function () {
      context('string id', function () {
        it('extends the array with the new id', function () {
          const uiExports = new UiExports({});
          const plugin = { id: 'someplugin' };
          uiExports.aliases.type = ['name'];
          uiExports.extendAliases(plugin, 'type', 'file.js');
          expect(uiExports.aliases.type).to.eql(['name', 'file.js']);
        });
      });

      context('array id', function () {
        it('creates a new array, merges the array', function () {
          const uiExports = new UiExports({});
          uiExports.aliases.type = ['other'];
          const plugin = { id: 'someplugin' };
          const ids = ['file.js', './say.js'];
          uiExports.extendAliases(plugin, 'type', ids);
          expect(uiExports.aliases.type).to.eql(['other', 'file.js', 'plugins/someplugin/say.js']);
          expect(uiExports.aliases.type).to.not.be(ids);
        });
      });
    });
  });
});
