var expect = require('expect.js');
var sinon = require('sinon');

var pluginLogger = require('../pluginLogger');

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('logger', function () {

      var logger;

      describe('logger.log', function () {

        beforeEach(function () {
          sinon.spy(process.stdout, 'write');
        });

        afterEach(function () {
          process.stdout.write.restore();
        });

        it('should log messages to the console and append a new line', function () {
          logger = pluginLogger({ silent: false, quiet: false });
          var message = 'this is my message';

          logger.log(message);

          var callCount = process.stdout.write.callCount;
          expect(process.stdout.write.getCall(callCount - 2).args[0]).to.be(message);
          expect(process.stdout.write.getCall(callCount - 1).args[0]).to.be('\n');
        });

        it('should log messages to the console and append not append a new line', function () {
          logger = pluginLogger({ silent: false, quiet: false });
          for (var i = 0; i < 10; i++) {
            logger.log('.', true);
          }
          logger.log('Done!');

          expect(process.stdout.write.callCount).to.be(13);
          expect(process.stdout.write.getCall(0).args[0]).to.be('.');
          expect(process.stdout.write.getCall(1).args[0]).to.be('.');
          expect(process.stdout.write.getCall(2).args[0]).to.be('.');
          expect(process.stdout.write.getCall(3).args[0]).to.be('.');
          expect(process.stdout.write.getCall(4).args[0]).to.be('.');
          expect(process.stdout.write.getCall(5).args[0]).to.be('.');
          expect(process.stdout.write.getCall(6).args[0]).to.be('.');
          expect(process.stdout.write.getCall(7).args[0]).to.be('.');
          expect(process.stdout.write.getCall(8).args[0]).to.be('.');
          expect(process.stdout.write.getCall(9).args[0]).to.be('.');
          expect(process.stdout.write.getCall(10).args[0]).to.be('\n');
          expect(process.stdout.write.getCall(11).args[0]).to.be('Done!');
          expect(process.stdout.write.getCall(12).args[0]).to.be('\n');
        });

        it('should not log any messages when quiet is set', function () {
          logger = pluginLogger({ silent: false, quiet: true });

          var message = 'this is my message';
          logger.log(message);

          for (var i = 0; i < 10; i++) {
            logger.log('.', true);
          }
          logger.log('Done!');

          expect(process.stdout.write.callCount).to.be(0);
        });

        it('should not log any messages when silent is set', function () {
          logger = pluginLogger({ silent: true, quiet: false });

          var message = 'this is my message';
          logger.log(message);

          for (var i = 0; i < 10; i++) {
            logger.log('.', true);
          }
          logger.log('Done!');

          expect(process.stdout.write.callCount).to.be(0);
        });

      });

      describe('logger.error', function () {

        beforeEach(function () {
          sinon.spy(process.stderr, 'write');
        });

        afterEach(function () {
          process.stderr.write.restore();
        });

        it('should log error messages to the console and append a new line', function () {
          logger = pluginLogger({ silent: false, quiet: false });
          var message = 'this is my error';

          logger.error(message);
          expect(process.stderr.write.calledWith(message + '\n')).to.be(true);
        });

        it('should log error messages to the console when quiet is set', function () {
          logger = pluginLogger({ silent: false, quiet: true });
          var message = 'this is my error';

          logger.error(message);
          expect(process.stderr.write.calledWith(message + '\n')).to.be(true);
        });

        it('should not log any error messages when silent is set', function () {
          logger = pluginLogger({ silent: true, quiet: false });
          var message = 'this is my error';

          logger.error(message);
          expect(process.stderr.write.callCount).to.be(0);
        });

      });

    });

  });

});
