import expect from 'expect.js';
import sinon from 'sinon';
import rimraf from 'rimraf';
import pluginLogger from '../plugin_logger';
import pluginInstaller from '../plugin_installer';
import { mkdirSync } from 'fs';
import { join } from 'path';

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('pluginInstaller', function () {
      let logger;
      let testWorkingPath;
      let processExitStub;

      beforeEach(function () {
        processExitStub = undefined;
        logger = pluginLogger(false);
        testWorkingPath = join(__dirname, '.test.data');
        rimraf.sync(testWorkingPath);
        sinon.stub(logger, 'log');
        sinon.stub(logger, 'error');
      });

      afterEach(function () {
        if (processExitStub) processExitStub.restore();
        logger.log.restore();
        logger.error.restore();
        rimraf.sync(testWorkingPath);
      });

      it('should throw an error if the workingPath already exists.', function () {
        processExitStub = sinon.stub(process, 'exit');
        mkdirSync(testWorkingPath);

        let settings = {
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

    });

  });

});
