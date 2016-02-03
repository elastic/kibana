import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ngMock';
describe('Optioned', function () {

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
