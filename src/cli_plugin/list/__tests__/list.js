import expect from 'expect.js';
import sinon from 'sinon';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import Logger from '../../lib/logger';
import list from '../list';
import { join } from 'path';
import { writeFileSync } from 'fs';

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
      mkdirp.sync(join(pluginDir, 'plugin1'));
      mkdirp.sync(join(pluginDir, 'plugin2'));
      mkdirp.sync(join(pluginDir, 'plugin3'));

      list(settings, logger);

      expect(logger.log.calledWith('plugin1')).to.be(true);
      expect(logger.log.calledWith('plugin2')).to.be(true);
      expect(logger.log.calledWith('plugin3')).to.be(true);
    });

    it('ignore folders that start with a period', function () {
      mkdirp.sync(join(pluginDir, '.foo'));
      mkdirp.sync(join(pluginDir, 'plugin1'));
      mkdirp.sync(join(pluginDir, 'plugin2'));
      mkdirp.sync(join(pluginDir, 'plugin3'));
      mkdirp.sync(join(pluginDir, '.bar'));

      list(settings, logger);

      expect(logger.log.calledWith('.foo')).to.be(false);
      expect(logger.log.calledWith('.bar')).to.be(false);
    });

    it('list should only list folders', function () {
      mkdirp.sync(join(pluginDir, 'plugin1'));
      mkdirp.sync(join(pluginDir, 'plugin2'));
      mkdirp.sync(join(pluginDir, 'plugin3'));
      writeFileSync(join(pluginDir, 'plugin4'), 'This is a file, and not a folder.');

      list(settings, logger);

      expect(logger.log.calledWith('plugin1')).to.be(true);
      expect(logger.log.calledWith('plugin2')).to.be(true);
      expect(logger.log.calledWith('plugin3')).to.be(true);
    });

  });

});
