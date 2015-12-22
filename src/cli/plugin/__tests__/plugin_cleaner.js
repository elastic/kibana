const expect = require('expect.js');
const sinon = require('sinon');
const fs = require('fs');
const rimraf = require('rimraf');

const pluginCleaner = require('../plugin_cleaner');
const pluginLogger = require('../plugin_logger');

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('pluginCleaner', function () {
      const settings = {
        workingPath: 'dummy'
      };

      describe('cleanPrevious', function () {
        let cleaner;
        let errorStub;
        let logger;
        let progress;
        let request;

        beforeEach(function () {
          errorStub = sinon.stub();
          logger = pluginLogger(false);
          cleaner = pluginCleaner(settings, logger);
          sinon.stub(logger, 'log');
          sinon.stub(logger, 'error');
          request = {
            abort: sinon.stub(),
            emit: sinon.stub()
          };
        });

        afterEach(function () {
          logger.log.restore();
          logger.error.restore();
          fs.statSync.restore();
          rimraf.sync.restore();
        });

        it('should resolve if the working path does not exist', function () {
          sinon.stub(rimraf, 'sync');
          sinon.stub(fs, 'statSync', function () {
            const error = new Error('ENOENT');
            error.code = 'ENOENT';
            throw error;
          });

          return cleaner.cleanPrevious(logger)
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(false);
          });
        });

        it('should rethrow any exception except ENOENT from fs.statSync', function () {
          sinon.stub(rimraf, 'sync');
          sinon.stub(fs, 'statSync', function () {
            const error = new Error('An Unhandled Error');
            throw error;
          });

          errorStub = sinon.stub();
          return cleaner.cleanPrevious(logger)
          .catch(errorStub)
          .then(function () {
            expect(errorStub.called).to.be(true);
          });
        });

        it('should log a message if there was a working directory', function () {
          sinon.stub(rimraf, 'sync');
          sinon.stub(fs, 'statSync');

          return cleaner.cleanPrevious(logger)
          .catch(errorStub)
          .then(function (data) {
            expect(logger.log.calledWith('Found previous install attempt. Deleting...')).to.be(true);
          });
        });

        it('should rethrow any exception from rimraf.sync', function () {
          sinon.stub(fs, 'statSync');
          sinon.stub(rimraf, 'sync', function () {
            throw new Error('I am an error thrown by rimraf');
          });

          errorStub = sinon.stub();
          return cleaner.cleanPrevious(logger)
          .catch(errorStub)
          .then(function () {
            expect(errorStub.called).to.be(true);
          });
        });

        it('should resolve if the working path is deleted', function () {
          sinon.stub(rimraf, 'sync');
          sinon.stub(fs, 'statSync');

          return cleaner.cleanPrevious(logger)
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(false);
          });
        });

      });

      describe('cleanError', function () {
        let cleaner;
        let logger;

        beforeEach(function () {
          logger = pluginLogger(false);
          cleaner = pluginCleaner(settings, logger);
        });

        afterEach(function () {
          rimraf.sync.restore();
        });

        it('should attempt to delete the working directory', function () {
          sinon.stub(rimraf, 'sync');

          cleaner.cleanError();
          expect(rimraf.sync.calledWith(settings.workingPath)).to.be(true);
        });

        it('should swallow any errors thrown by rimraf.sync', function () {
          sinon.stub(rimraf, 'sync', function () {
            throw new Error('Something bad happened.');
          });

          expect(cleaner.cleanError).withArgs(settings).to.not.throwError();
        });

      });

    });

  });

});
