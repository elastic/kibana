describe('autoReleaseSinon', function () {
  var hook = require('../');
  var sinon = require('sinon');
  require('chai').should();

  it('releases stubs during afterEach', function () {
    var stub = {
      restore: sinon.stub()
    };

    var orig = function () {
      return stub
    };

    var notSinon = { stub: orig };
    var afterEach = sinon.stub();
    var hooked = hook(notSinon, afterEach);

    hooked.stub.should.not.equal(orig);
    hooked.stub();

    stub.restore.callCount.should.eql(0);
    afterEach.args[0][0](); // call the handler passed to afterEach
    stub.restore.callCount.should.eql(1);
  });
});