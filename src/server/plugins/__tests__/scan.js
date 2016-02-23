import sinon from 'auto-release-sinon';
import expect from 'expect.js';

import StubKbnServer from '../../__tests__/stub_kbn_server';
import { loadPluginsFromPaths } from '../scan';
import PluginCollection from '../PluginCollection';

describe('plugin scanning', function () {
  describe('loadPluginsFromPaths', function () {
    this.timeout(Infinity);

    function init() {
      const server = new StubKbnServer();
      const plugins = new PluginCollection(server);
      sinon.stub(plugins, 'new');
      sinon.stub(plugins, 'newFromPackageJson');

      const log = {
        debug: sinon.stub(),
        warning: sinon.stub()
      };

      return { plugins, log };
    }

    it('calls plugins.new() and plugins.newFromPackageJson() with each path', async function () {
      const { plugins, log } = init();
      await loadPluginsFromPaths(plugins, log, ['pluginPath']);
      sinon.assert.calledOnce(plugins.new);
      sinon.assert.calledWith(plugins.new, 'pluginPath');
      sinon.assert.calledOnce(plugins.newFromPackageJson);
      sinon.assert.calledWith(plugins.newFromPackageJson, 'pluginPath');
    });

    context('plugins.new() and plugins.newFromPackageJson() both return false', function () {
      it('logs warning', async function () {
        const { plugins, log } = init();
        plugins.new.returns(false);
        plugins.newFromPackageJson.returns(false);

        await loadPluginsFromPaths(plugins, log, ['pluginPath']);
        sinon.assert.calledOnce(log.warning);
      });
    });

    context('plugins.new() or plugins.newFromPackageJson() returns false', function () {
      it('does not log warning', async function () {
        const { plugins, log } = init();
        plugins.new.returns(true);
        plugins.newFromPackageJson.returns(false);

        await loadPluginsFromPaths(plugins, log, ['pluginPath']);
        sinon.assert.notCalled(log.warning);
      });

      it('does not log warning', async function () {
        const { plugins, log } = init();
        plugins.new.returns(false);
        plugins.newFromPackageJson.returns(true);

        await loadPluginsFromPaths(plugins, log, ['pluginPath']);
        sinon.assert.notCalled(log.warning);
      });
    });

    context('plugins.new() and plugins.newFromPackageJson() returns true', function () {
      it('does not log warning', async function () {
        const { plugins, log } = init();
        plugins.new.returns(true);
        plugins.newFromPackageJson.returns(true);

        await loadPluginsFromPaths(plugins, log, ['pluginPath']);
        sinon.assert.notCalled(log.warning);
      });
    });

    context('plugins.new() or plugins.newFromPackageJson() throws an error', function () {
      it('logs a warning', async function () {
        const { plugins, log } = init();
        plugins.new.throws(new Error('message'));
        plugins.newFromPackageJson.throws(new Error('message'));

        await loadPluginsFromPaths(plugins, log, ['pluginPath']);
        sinon.assert.calledThrice(log.warning);
      });

      it('logs a warning', async function () {
        const { plugins, log } = init();
        plugins.new.throws(new Error('message'));
        plugins.newFromPackageJson.returns(true);

        await loadPluginsFromPaths(plugins, log, ['pluginPath']);
        sinon.assert.calledOnce(log.warning);
      });

      it('logs a warning', async function () {
        const { plugins, log } = init();
        plugins.new.returns(true);
        plugins.newFromPackageJson.throws(new Error('message'));

        await loadPluginsFromPaths(plugins, log, ['pluginPath']);
        sinon.assert.calledOnce(log.warning);
      });
    });
  });
});
