var expect = require('expect.js');
var sinon = require('sinon');
var nock = require('nock');
var rimraf = require('rimraf');
var fs = require('fs');
var { join } = require('path');
var Promise = require('bluebird');

var pluginLogger = require('../pluginLogger');
var pluginInstaller = require('../pluginInstaller');

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('pluginInstaller', function () {

      var logger;
      var testWorkingPath;
      var processExitStub;
      var statSyncStub;
      beforeEach(function () {
        processExitStub = undefined;
        statSyncStub = undefined;
        logger = pluginLogger(false);
        testWorkingPath = join(__dirname, '.test.data');
        rimraf.sync(testWorkingPath);
        sinon.stub(logger, 'log');
        sinon.stub(logger, 'error');
      });

      afterEach(function () {
        if (processExitStub) processExitStub.restore();
        if (statSyncStub) statSyncStub.restore();
        logger.log.restore();
        logger.error.restore();
        rimraf.sync(testWorkingPath);
      });

      it('should throw an error if the workingPath already exists.', function () {
        processExitStub = sinon.stub(process, 'exit');
        fs.mkdirSync(testWorkingPath);

        var settings = {
          pluginPath: testWorkingPath
        };

        var errorStub = sinon.stub();
        return pluginInstaller.install(settings, logger)
        .catch(errorStub)
        .then(function (data) {
          expect(logger.error.firstCall.args[0]).to.match(/already exists/);
          expect(process.exit.called).to.be(true);
        });
      });

      it('should rethrow any non "ENOENT" error from fs.', function () {
        statSyncStub = sinon.stub(fs, 'statSync', function () {
          throw new Error('This is unexpected.');
        });

        var settings = {
          pluginPath: testWorkingPath
        };

        expect(pluginInstaller.install).withArgs(settings, logger).to.throwException(/this is unexpected/i);
      });

    });

  });

});
