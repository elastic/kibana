import expect from 'expect.js';
import ngMock from 'ng_mock';
import { AggTypesParamTypesBaseProvider } from 'ui/agg_types/param_types/base';
import { AggTypesParamTypesOptionedProvider } from 'ui/agg_types/param_types/optioned';

describe('Optioned', function () {

  let BaseAggParam;
  let OptionedAggParam;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    BaseAggParam = Private(AggTypesParamTypesBaseProvider);
    OptionedAggParam = Private(AggTypesParamTypesOptionedProvider);
  }));

  describe('constructor', function () {
    it('it is an instance of BaseAggParam', function () {
      const aggParam = new OptionedAggParam({
        name: 'some_param',
        type: 'optioned'
      });

      expect(aggParam).to.be.a(BaseAggParam);
    });
  });
});
