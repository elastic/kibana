var expect = require('expect.js');
var sinon = require('sinon');
var progressReporter = require('../progressReporter');
var pluginLogger = require('../pluginLogger');

describe('kibana cli', function () {

  describe('plugin installer', function () {

    describe('progressReporter', function () {

      var logger;
      var progress;
      var request;
      beforeEach(function () {
        logger = pluginLogger(false);
        sinon.stub(logger, 'log');
        sinon.stub(logger, 'error');
        request = {
          abort: sinon.stub(),
          emit: sinon.stub()
        };
        progress = progressReporter(logger, request);
      });

      afterEach(function () {
        logger.log.restore();
        logger.error.restore();
      });

      describe('handleResponse', function () {

        describe('bad response codes', function () {

          function testErrorResponse(element, index, array) {
            it('should set the state to error for response code = ' + element, function () {
              progress.handleResponse({ statusCode: element });

              var errorStub = sinon.stub();
              return progress.promise
              .catch(errorStub)
              .then(function (data) {
                expect(errorStub.called).to.be(true);
                expect(errorStub.lastCall.args[0].message).to.match(/ENOTFOUND/);
              });
            });
          }

          var badCodes = [
            '400', '401', '402', '403', '404', '405', '406', '407', '408', '409', '410',
            '411', '412', '413', '414', '415', '416', '417', '500', '501', '502', '503',
            '504', '505'
          ];

          badCodes.forEach(testErrorResponse);
        });

        describe('good response codes', function () {

          function testSuccessResponse(statusCode, index, array) {
            it('should set the state to success for response code = ' + statusCode, function () {
              progress.handleResponse({ statusCode: statusCode, headers: { 'content-length': 1000 } });
              progress.handleEnd();

              var errorStub = sinon.stub();
              return progress.promise
              .catch(errorStub)
              .then(function (data) {
                expect(errorStub.called).to.be(false);
                expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/1000/);
              });
            });
          }


          function testUnknownNumber(statusCode, index, array) {
            it('should log "unknown number of" for response code = ' + statusCode + ' without content-length header', function () {
              progress.handleResponse({ statusCode: statusCode, headers: {} });
              progress.handleEnd();

              var errorStub = sinon.stub();
              return progress.promise
              .catch(errorStub)
              .then(function (data) {
                expect(errorStub.called).to.be(false);
                expect(logger.log.getCall(logger.log.callCount - 2).args[0]).to.match(/unknown number/);
              });
            });
          }

          var goodCodes = [
            '200', '201', '202', '203', '204', '205', '206', '300', '301', '302', '303',
            '304', '305', '306', '307'
          ];

          goodCodes.forEach(testSuccessResponse);
          goodCodes.forEach(testUnknownNumber);

        });

      });

      describe('handleData', function () {

        it('should do nothing if the reporter is in an error state', function () {
          progress.handleResponse({ statusCode: 400 });
          progress.handleData({ length: 100 });

          var errorStub = sinon.stub();
          return progress.promise
          .catch(errorStub)
          .then(function (data) {
            expect(progress.hasError()).to.be(true);
            expect(request.abort.called).to.be(true);
            expect(logger.log.callCount).to.be(0);
          });
        });

        it('should do nothing if handleResponse hasn\'t successfully executed yet', function () {
          progress.handleData({ length: 100 });
          progress.handleEnd();

          var errorStub = sinon.stub();
          return progress.promise
          .catch(errorStub)
          .then(function (data) {
            expect(logger.log.callCount).to.be(1);
            expect(logger.log.lastCall.args[0]).to.match(/complete/i);
          });
        });

        it('should do nothing if handleResponse was called without a content-length header', function () {
          progress.handleResponse({ statusCode: 200, headers: {} });
          progress.handleData({ length: 100 });
          progress.handleEnd();

          var errorStub = sinon.stub();
          return progress.promise
          .catch(errorStub)
          .then(function (data) {
            expect(logger.log.callCount).to.be(2);
            expect(logger.log.getCall(0).args[0]).to.match(/downloading/i);
            expect(logger.log.getCall(1).args[0]).to.match(/complete/i);
          });
        });

        it('should show a max of 20 dots for full prgress', function () {
          progress.handleResponse({ statusCode: 200, headers: { 'content-length': 1000 } });
          progress.handleData({ length: 1000 });
          progress.handleEnd();

          var errorStub = sinon.stub();
          return progress.promise
          .catch(errorStub)
          .then(function (data) {
            expect(logger.log.callCount).to.be(22);
            expect(logger.log.getCall(0).args[0]).to.match(/downloading/i);
            expect(logger.log.getCall(1).args[0]).to.be('.');
            expect(logger.log.getCall(2).args[0]).to.be('.');
            expect(logger.log.getCall(3).args[0]).to.be('.');
            expect(logger.log.getCall(4).args[0]).to.be('.');
            expect(logger.log.getCall(5).args[0]).to.be('.');
            expect(logger.log.getCall(6).args[0]).to.be('.');
            expect(logger.log.getCall(7).args[0]).to.be('.');
            expect(logger.log.getCall(8).args[0]).to.be('.');
            expect(logger.log.getCall(9).args[0]).to.be('.');
            expect(logger.log.getCall(10).args[0]).to.be('.');
            expect(logger.log.getCall(11).args[0]).to.be('.');
            expect(logger.log.getCall(12).args[0]).to.be('.');
            expect(logger.log.getCall(13).args[0]).to.be('.');
            expect(logger.log.getCall(14).args[0]).to.be('.');
            expect(logger.log.getCall(15).args[0]).to.be('.');
            expect(logger.log.getCall(16).args[0]).to.be('.');
            expect(logger.log.getCall(17).args[0]).to.be('.');
            expect(logger.log.getCall(18).args[0]).to.be('.');
            expect(logger.log.getCall(19).args[0]).to.be('.');
            expect(logger.log.getCall(20).args[0]).to.be('.');
            expect(logger.log.getCall(21).args[0]).to.match(/complete/i);
          });

        });

        it('should show dot for each 5% of completion', function () {
          progress.handleResponse({ statusCode: 200, headers: { 'content-length': 1000 } });
          expect(logger.log.callCount).to.be(1);

          progress.handleData({ length: 50 });  //5%
          expect(logger.log.callCount).to.be(2);

          progress.handleData({ length: 100 }); //15%
          expect(logger.log.callCount).to.be(4);

          progress.handleData({ length: 200 }); //25%
          expect(logger.log.callCount).to.be(8);

          progress.handleData({ length: 590 }); //94%
          expect(logger.log.callCount).to.be(20);

          progress.handleData({ length: 60 });  //100%
          expect(logger.log.callCount).to.be(21);

          //Any progress over 100% should be ignored.
          progress.handleData({ length: 9999 });
          expect(logger.log.callCount).to.be(21);

          progress.handleEnd();
          expect(logger.log.callCount).to.be(22);

          var errorStub = sinon.stub();
          return progress.promise
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(false);
            expect(logger.log.getCall(0).args[0]).to.match(/downloading/i);
            expect(logger.log.getCall(21).args[0]).to.match(/complete/i);
          });
        });

      });

      describe('handleEnd', function () {

        it('should reject the deferred with a ENOTFOUND error if the reporter is in an error state', function () {
          progress.handleResponse({ statusCode: 400 });

          progress.handleEnd();

          var errorStub = sinon.stub();
          return progress.promise
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.firstCall.args[0].message).to.match(/ENOTFOUND/);
            expect(errorStub.called).to.be(true);
          });
        });

        it('should resolve if the reporter is not in an error state', function () {
          progress.handleResponse({ statusCode: 307, headers: { 'content-length': 1000 } });

          progress.handleEnd();

          var errorStub = sinon.stub();
          return progress.promise
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(false);
            expect(logger.log.lastCall.args[0]).to.match(/complete/i);
          });
        });

      });

      describe('handleError', function () {

        it('should log any errors', function () {
          progress.handleError('ERRORMESSAGE', new Error('oops!'));

          var errorStub = sinon.stub();
          return progress.promise
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(true);
            expect(logger.error.callCount).to.be(1);
            expect(logger.error.lastCall.args[0]).to.match(/oops!/);
          });
        });

        it('should set the error state of the reporter', function () {
          progress.handleError('ERRORMESSAGE', new Error('oops!'));

          var errorStub = sinon.stub();
          return progress.promise
          .catch(errorStub)
          .then(function (data) {
            expect(progress.hasError()).to.be(true);
          });
        });

        it('should ignore all errors except the first.', function () {
          progress.handleError('ERRORMESSAGE', new Error('oops!'));
          progress.handleError('ERRORMESSAGE', new Error('second error!'));
          progress.handleError('ERRORMESSAGE', new Error('third error!'));
          progress.handleError('ERRORMESSAGE', new Error('fourth error!'));

          var errorStub = sinon.stub();
          return progress.promise
          .catch(errorStub)
          .then(function (data) {
            expect(errorStub.called).to.be(true);
            expect(logger.error.callCount).to.be(1);
            expect(logger.error.lastCall.args[0]).to.match(/oops!/);
          });
        });

      });

    });

  });

});
