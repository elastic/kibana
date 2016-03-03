import expect from 'expect.js';
import sinon from 'sinon';
import glob from 'glob';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import Logger from '../../lib/logger';
import remove from '../remove';
import { join } from 'path';

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

    it('log a message if the plugin is not installed.', function () {
      settings.pluginPath = join(pluginDir, 'foo');
      remove(settings, logger);

      expect(logger.log.firstCall.args[0]).to.match(/not installed/i);
    });

    it('delete the specified folder.', function () {
      settings.pluginPath = join(pluginDir, 'foo');
      mkdirp.sync(join(pluginDir, 'foo'));
      mkdirp.sync(join(pluginDir, 'bar'));

      remove(settings, logger);

      const files = glob.sync('**/*', { cwd: pluginDir });
      const expected = ['bar'];
      expect(files.sort()).to.eql(expected.sort());
    });

  });

});
