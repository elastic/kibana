import sinon from 'sinon';
import mockFs from 'mock-fs';
import Logger from '../lib/logger';
import { join } from 'path';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import { existingInstall, assertVersion } from './kibana';

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('kibana', function () {
      const testWorkingPath = join(__dirname, '.test.data.kibana');
      const tempArchiveFilePath = join(testWorkingPath, 'archive.part');
      const pluginDir = join(__dirname, 'plugins');

      const settings = {
        workingPath: testWorkingPath,
        tempArchiveFile: tempArchiveFilePath,
        plugin: 'test-plugin',
        version: '1.0.0',
        plugins: [ { name: 'foo' } ],
        pluginDir
      };

      const logger = new Logger(settings);

      describe('assertVersion', function () {

        beforeEach(function () {
          rimraf.sync(testWorkingPath);
          mkdirp.sync(testWorkingPath);
          sinon.stub(logger, 'log');
          sinon.stub(logger, 'error');
        });

        afterEach(function () {
          logger.log.restore();
          logger.error.restore();
          rimraf.sync(testWorkingPath);
        });

        it('should succeed with exact match', function () {
          const settings = {
            workingPath: testWorkingPath,
            tempArchiveFile: tempArchiveFilePath,
            plugin: 'test-plugin',
            version: '5.0.0-SNAPSHOT',
            plugins: [ { name: 'foo', path: join(testWorkingPath, 'foo'), kibanaVersion: '5.0.0-SNAPSHOT' } ]
          };

          expect(() => assertVersion(settings)).not.toThrow();
        });

        it('should throw an error if plugin is missing a kibana version.', function () {
          expect(() => assertVersion(settings)).toThrow(
            /plugin package\.json is missing both a version property/i
          );
        });

        it('should throw an error if plugin kibanaVersion does not match kibana version', function () {
          settings.plugins[0].kibanaVersion = '1.2.3.4';

          expect(() => assertVersion(settings)).toThrow(/incorrect kibana version/i);
        });

        it('should not throw an error if plugin kibanaVersion matches kibana version', function () {
          settings.plugins[0].kibanaVersion = '1.0.0';

          expect(() => assertVersion(settings)).not.toThrow();
        });

        it('should ignore version info after the dash in checks on valid version', function () {
          settings.plugins[0].kibanaVersion = '1.0.0-foo-bar-version-1.2.3';

          expect(() => assertVersion(settings)).not.toThrow();
        });

        it('should ignore version info after the dash in checks on invalid version', function () {
          settings.plugins[0].kibanaVersion = '2.0.0-foo-bar-version-1.2.3';

          expect(() => assertVersion(settings)).toThrow(/incorrect kibana version/i);
        });
      });

      describe('existingInstall', function () {
        let processExitStub;

        beforeEach(function () {
          processExitStub = sinon.stub(process, 'exit');
          sinon.stub(logger, 'log');
          sinon.stub(logger, 'error');
        });

        afterEach(function () {
          processExitStub.restore();
          logger.log.restore();
          logger.error.restore();
        });

        it('should throw an error if the plugin already exists.', function () {
          mockFs({ [`${pluginDir}/foo`]: {} });

          existingInstall(settings, logger);
          expect(logger.error.firstCall.args[0]).toMatch(/already exists/);
          expect(process.exit.called).toBe(true);

          mockFs.restore();
        });

        it('should not throw an error if the plugin does not exist.', function () {
          existingInstall(settings, logger);
          expect(logger.error.called).toBe(false);
        });
      });
    });
  });
});
