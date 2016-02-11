import { resolve } from 'path';
import expect from 'expect.js';

import StubKbnServer from '../../__tests__/stub_kbn_server';
import PluginCollection from '../PluginCollection';

const existingJsPlugin = resolve(__dirname, './fixtures/plugin');
const existingPkgPlugin = resolve(__dirname, './fixtures/pkg_plugin');
const notExistingPlugin = resolve(__dirname, './fixtures/not_existing_plugin');
const jsPluginWithSyntaxErr = resolve(__dirname, './fixtures/plugin_with_syntax_error');
const existingJsPluginNoOutput = resolve(__dirname, './fixtures/plugin_no_output');

describe('PluginCollection', function () {
  describe('#new', function () {
    function init() {
      const server = new StubKbnServer();
      const plugins = new PluginCollection(server);
      return { plugins };
    }

    context('path does not exist', function () {
      it('returns false', async function () {
        const { plugins } = init();
        expect(await plugins.new(notExistingPlugin)).to.be(false);
      });
    });

    context('existing package.json-based plugin', function () {
      it('returns false', async function () {
        const { plugins } = init();
        expect(await plugins.new(existingPkgPlugin)).to.be(false);
      });
    });

    context('existing js-based plugin', function () {
      it('returns true', async function () {
        const { plugins } = init();
        expect(await plugins.new(existingJsPlugin)).to.be(true);
      });
    });

    context('existing js-based plugin without any output', function () {
      it('returns true', async function () {
        const { plugins } = init();
        expect(await plugins.new(existingJsPluginNoOutput)).to.be(true);
      });
    });

    context('js-based plugin with a syntax error', function () {
      it('throws the syntax error', async function () {
        const { plugins } = init();

        try {
          await plugins.new(jsPluginWithSyntaxErr);
        } catch (e) {
          return;
        }

        throw new Error('expected plugin.new to throw an error');
      });
    });
  });
});
