import expect from 'expect.js';
import sinon from 'sinon';
import Logger from '../../lib/logger';
import { join } from 'path';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import { existingInstall, checkVersion } from '../kibana';

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('kibana', function () {
      const testWorkingPath = join(__dirname, '.test.data');
      const tempArchiveFilePath = join(testWorkingPath, 'archive.part');

      const settings = {
        workingPath: testWorkingPath,
        tempArchiveFile: tempArchiveFilePath,
        plugin: 'test-plugin',
        version: '1.0.0',
        plugins: [ { name: 'foo', path: join(testWorkingPath, 'foo') } ]
      };

      const logger = new Logger(settings);

      describe('checkVersion', function () {

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

        it('should throw an error if plugin does contain a version.', function () {
          const errorStub = sinon.stub();

          try {
            checkVersion(settings);
          }
          catch (err) {
            errorStub(err);
          }

          expect(errorStub.firstCall.args[0]).to.match(/plugin version not found/i);
        });

        it('should throw an error if plugin version does does not match kibana version', function () {
          const errorStub = sinon.stub();
          settings.plugins[0].version = '1.2.3.4';

          try {
            checkVersion(settings);
          }
          catch (err) {
            errorStub(err);
          }

          expect(errorStub.firstCall.args[0]).to.match(/incorrect version/i);
        });
      });

      describe('existingInstall', function () {
        let testWorkingPath;
        let processExitStub;

        beforeEach(function () {
          processExitStub = sinon.stub(process, 'exit');
          testWorkingPath = join(__dirname, '.test.data');
          rimraf.sync(testWorkingPath);
          sinon.stub(logger, 'log');
          sinon.stub(logger, 'error');
        });

        afterEach(function () {
          processExitStub.restore();
          logger.log.restore();
          logger.error.restore();
          rimraf.sync(testWorkingPath);
        });

        it('should throw an error if the workingPath already exists.', function () {
          mkdirp.sync(settings.plugins[0].path);
          existingInstall(settings, logger);

          expect(logger.error.firstCall.args[0]).to.match(/already exists/);
          expect(process.exit.called).to.be(true);
        });

        it('should not throw an error if the workingPath does not exist.', function () {
          existingInstall(settings, logger);
          expect(logger.error.called).to.be(false);
        });

      });

    });

  });

});
