define(function (require) {
  var _ = require('lodash');
  var sinon = require('auto-release-sinon');

  function MockState(defaults) {
    this.on = _.noop;
    this.off = _.noop;
    this.save = sinon.stub();
    _.assign(this, defaults);
  }

  MockState.prototype.resetStub = function () {
    this.save = sinon.stub();
    return this;
  };

  return MockState;
});
