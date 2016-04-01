describe('Optioned', function () {
  let _ = require('lodash');
  let expect = require('expect.js');
  let ngMock = require('ngMock');

  let BaseAggParam;
  let OptionedAggParam;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    BaseAggParam = Private(require('ui/agg_types/param_types/base'));
    OptionedAggParam = Private(require('ui/agg_types/param_types/optioned'));
  }));

  describe('constructor', function () {
    it('it is an instance of BaseAggParam', function () {
      let aggParam = new OptionedAggParam({
        name: 'some_param',
        type: 'optioned'
      });

      expect(aggParam).to.be.a(BaseAggParam);
    });
  });
});
