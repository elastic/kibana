var expect = require('expect.js');
var nock = require('nock');
var glob = require('glob');
var rimraf = require('rimraf');
var fs = require('fs');
var join = require('path').join;
var sinon = require('sinon');

var pluginLogger = require('../pluginLogger');
var npmInstall = require('../npmInstall');

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('npmInstall', function () {

      var logger;
      var testWorkingPath = join(__dirname, '.test.data');
      var statSyncStub;

      beforeEach(function () {
        statSyncStub = undefined;
        logger = pluginLogger(false);
        rimraf.sync(testWorkingPath);
        sinon.stub(logger, 'log');
        sinon.stub(logger, 'error');
      });

      afterEach(function () {
        logger.log.restore();
        logger.error.restore();
        rimraf.sync(testWorkingPath);
        if (statSyncStub) statSyncStub.restore();
      });

      it('should throw an error if there is no package.json file in the archive', function () {
        fs.mkdirSync(testWorkingPath);

        var errorStub = sinon.stub();
        return npmInstall(testWorkingPath, logger)
        .catch(errorStub)
        .then(function (data) {
          expect(errorStub.called).to.be(true);
          expect(errorStub.lastCall.args[0].message).to.match(/package.json/);
        });
      });

      it('should rethrow any errors other than "ENOENT" from fs.statSync', function () {
        fs.mkdirSync(testWorkingPath);

        statSyncStub = sinon.stub(fs, 'statSync', function () {
          throw new Error('This is unexpected.');
        });

        var errorStub = sinon.stub();
        return npmInstall(testWorkingPath, logger)
        .catch(errorStub)
        .then(function (data) {
          expect(errorStub.called).to.be(true);
          expect(errorStub.lastCall.args[0].message).to.match(/This is unexpected./);
        });
      });

    });

  });

});
