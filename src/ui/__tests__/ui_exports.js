import expect from 'expect.js';
import { resolve } from 'path';

import UiExports from '../ui_exports';
import * as kbnTestServer from '../../test_utils/kbn_server';

describe('UiExports', function () {
  describe('#find()', function () {
    it('finds exports based on the passed export names', function () {
      const uiExports = new UiExports({});
      uiExports.aliases.foo = ['a', 'b', 'c'];
      uiExports.aliases.bar = ['d', 'e', 'f'];

      expect(uiExports.find(['foo'])).to.eql(['a', 'b', 'c']);
      expect(uiExports.find(['bar'])).to.eql(['d', 'e', 'f']);
      expect(uiExports.find(['foo', 'bar'])).to.eql(['a', 'b', 'c', 'd', 'e', 'f']);
    });

    it('allows query types that match nothing', function () {
      const uiExports = new UiExports({});
      uiExports.aliases.foo = ['a', 'b', 'c'];

      expect(uiExports.find(['foo'])).to.eql(['a', 'b', 'c']);
      expect(uiExports.find(['bar'])).to.eql([]);
      expect(uiExports.find(['foo', 'bar'])).to.eql(['a', 'b', 'c']);
    });
  });
//
  describe('#defaultInjectedVars', function () {
    describe('two plugins, two sync', function () {
      this.slow(10000);
      this.timeout(60000);

      let kbnServer;
      before(async function () {
        kbnServer = kbnTestServer.createServer({
          plugins: {
            paths: [
              resolve(__dirname, 'fixtures/plugin_bar'),
              resolve(__dirname, 'fixtures/plugin_foo')
            ]
          },

          plugin_foo: {
            shared: 'foo'
          },

          plugin_bar: {
            shared: 'bar'
          }
        });

        await kbnServer.ready();
      });

      after(async function () {
        await kbnServer.close();
      });

      it('merges the two plugins in the order they are loaded', function () {
        expect(kbnServer.uiExports.defaultInjectedVars).to.eql({
          shared: 'foo'
        });
      });
    });

    describe('two plugins, one async', function () {
      this.slow(10000);
      this.timeout(60000);

      let kbnServer;
      before(async function () {
        kbnServer = kbnTestServer.createServer({
          plugins: {
            scanDirs: [],
            paths: [
              resolve(__dirname, 'fixtures/plugin_async_foo'),
              resolve(__dirname, 'fixtures/plugin_foo')
            ]
          },

          plugin_async_foo: {
            delay: 500,
            shared: 'foo'
          },

          plugin_bar: {
            shared: 'bar'
          }
        });

        await kbnServer.ready();
      });

      after(async function () {
        await kbnServer.close();
      });

      it('merges the two plugins in the order they are loaded', function () {
        // even though plugin_async_foo loads 500ms later, it is still "first" to merge
        expect(kbnServer.uiExports.defaultInjectedVars).to.eql({
          shared: 'foo'
        });
      });
    });
  });
});
