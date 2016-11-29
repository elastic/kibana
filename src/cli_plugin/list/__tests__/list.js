import expect from 'expect.js';
import sinon from 'sinon';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import Logger from '../../lib/logger';
import list from '../list';
import { join } from 'path';
import { writeFileSync, appendFileSync } from 'fs';


function createPlugin(name, version, pluginBaseDir) {
  const pluginDir = join(pluginBaseDir, name);
  mkdirp.sync(pluginDir);
  appendFileSync(join(pluginDir, 'package.json'), '{"version": "' + version + '"}');
}

describe('kibana cli', function () {

  describe('plugin lister', function () {

    const pluginDir = join(__dirname, '.test.data');
    let logger;

    const settings = {
      pluginDir: pluginDir
    };

    beforeEach(function () {
      logger = new Logger(settings);
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
      rimraf.sync(pluginDir);
      mkdirp.sync(pluginDir);
    });

    afterEach(function () {
      logger.log.restore();
      logger.error.restore();
      rimraf.sync(pluginDir);
    });

    it('list all of the folders in the plugin folder', function () {
      createPlugin('plugin1', '5.0.0-alpha2', pluginDir);
      createPlugin('plugin2', '3.2.1', pluginDir);
      createPlugin('plugin3', '1.2.3', pluginDir);

      list(settings, logger);

      expect(logger.log.calledWith('plugin1@5.0.0-alpha2')).to.be(true);
      expect(logger.log.calledWith('plugin2@3.2.1')).to.be(true);
      expect(logger.log.calledWith('plugin3@1.2.3')).to.be(true);
    });

    it('ignore folders that start with a period', function () {
      createPlugin('.foo', '1.0.0', pluginDir);
      createPlugin('plugin1', '5.0.0-alpha2', pluginDir);
      createPlugin('plugin2', '3.2.1', pluginDir);
      createPlugin('plugin3', '1.2.3', pluginDir);
      createPlugin('.bar', '1.0.0', pluginDir);

      list(settings, logger);

      expect(logger.log.calledWith('.foo@1.0.0')).to.be(false);
      expect(logger.log.calledWith('.bar@1.0.0')).to.be(false);
    });

    it('list should only list folders', function () {
      createPlugin('plugin1', '1.0.0', pluginDir);
      createPlugin('plugin2', '1.0.0', pluginDir);
      createPlugin('plugin3', '1.0.0', pluginDir);
      writeFileSync(join(pluginDir, 'plugin4'), 'This is a file, and not a folder.');

      list(settings, logger);

      expect(logger.log.calledWith('plugin1@1.0.0')).to.be(true);
      expect(logger.log.calledWith('plugin2@1.0.0')).to.be(true);
      expect(logger.log.calledWith('plugin3@1.0.0')).to.be(true);
    });

    it('list should throw an exception if a plugin does not have a package.json', function () {
      createPlugin('plugin1', '1.0.0', pluginDir);
      mkdirp.sync(join(pluginDir, 'empty-plugin'));

      expect(function () {
        list(settings, logger);
      }).to.throwError('Unable to read package.json file for plugin empty-plugin');
    });

    it('list should throw an exception if a plugin have an empty package.json', function () {
      createPlugin('plugin1', '1.0.0', pluginDir);
      const invalidPluginDir = join(pluginDir, 'invalid-plugin');
      mkdirp.sync(invalidPluginDir);
      appendFileSync(join(invalidPluginDir, 'package.json'), '');

      expect(function () {
        list(settings, logger);
      }).to.throwError('Unable to read package.json file for plugin invalid-plugin');
    });

  });

});
