describe('Optioned', function () {
  var _ = require('lodash');
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  var BaseAggParam;
  var OptionedAggParam;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    BaseAggParam = Private(require('ui/agg_types/param_types/base'));
    OptionedAggParam = Private(require('ui/agg_types/param_types/optioned'));
  }));

  describe('constructor', function () {
    it('it is an instance of BaseAggParam', function () {
      var aggParam = new OptionedAggParam({
        name: 'some_param',
        type: 'optioned'
      });

      expect(aggParam).to.be.a(BaseAggParam);
    });
  });
});
