import sinon from 'sinon';
import glob from 'glob-all';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import Logger from '../lib/logger';
import remove from './remove';
import { join } from 'path';
import { writeFileSync, existsSync } from 'fs';

describe('kibana cli', function () {

  describe('plugin remover', function () {

    const pluginDir = join(__dirname, '.test.data.remove');
    let processExitStub;
    let logger;

    const settings = { pluginDir };

    beforeEach(function () {
      processExitStub = sinon.stub(process, 'exit');
      logger = new Logger(settings);
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
      rimraf.sync(pluginDir);
      mkdirp.sync(pluginDir);
    });

    afterEach(function () {
      processExitStub.restore();
      logger.log.restore();
      logger.error.restore();
      rimraf.sync(pluginDir);
    });

    it('throw an error if the plugin is not installed.', function () {
      settings.pluginPath = join(pluginDir, 'foo');
      settings.plugin = 'foo';

      remove(settings, logger);
      expect(logger.error.firstCall.args[0]).toMatch(/not installed/);
      expect(process.exit.called).toBe(true);
    });

    it('throw an error if the specified plugin is not a folder.', function () {
      writeFileSync(join(pluginDir, 'foo'), 'This is a file, and not a folder.');

      remove(settings, logger);
      expect(logger.error.firstCall.args[0]).toMatch(/not a plugin/);
      expect(process.exit.called).toBe(true);
    });

    it('remove x-pack if it exists', () => {
      settings.pluginPath = join(pluginDir, 'x-pack');
      settings.plugin = 'x-pack';
      mkdirp.sync(join(pluginDir, 'x-pack'));
      expect(existsSync(settings.pluginPath)).toEqual(true);
      remove(settings, logger);
      expect(existsSync(settings.pluginPath)).toEqual(false);
    });

    it('distribution error if x-pack does not exist', () => {
      settings.pluginPath = join(pluginDir, 'x-pack');
      settings.plugin = 'x-pack';
      expect(existsSync(settings.pluginPath)).toEqual(false);
      remove(settings, logger);
      expect(logger.error.getCall(0).args[0]).toMatch(/Please install the OSS-only distribution to remove X-Pack features/);
    });

    it('delete the specified folder.', function () {
      settings.pluginPath = join(pluginDir, 'foo');
      mkdirp.sync(join(pluginDir, 'foo'));
      mkdirp.sync(join(pluginDir, 'bar'));

      remove(settings, logger);

      const files = glob.sync('**/*', { cwd: pluginDir });
      const expected = ['bar'];
      expect(files.sort()).toEqual(expected.sort());
    });

  });

});
