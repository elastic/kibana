import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ngMock';
import AggTypesParamTypesBaseProvider from 'ui/agg_types/param_types/base';
import AggTypesParamTypesOptionedProvider from 'ui/agg_types/param_types/optioned';
describe('Optioned', function () {

  var BaseAggParam;
  var OptionedAggParam;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    BaseAggParam = Private(AggTypesParamTypesBaseProvider);
    OptionedAggParam = Private(AggTypesParamTypesOptionedProvider);
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
