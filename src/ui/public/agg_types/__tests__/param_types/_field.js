import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import AggTypesParamTypesBaseProvider from 'ui/agg_types/param_types/base';
import AggTypesParamTypesFieldProvider from 'ui/agg_types/param_types/field';
describe('Field', function () {

  let BaseAggParam;
  let FieldAggParam;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    BaseAggParam = Private(AggTypesParamTypesBaseProvider);
    FieldAggParam = Private(AggTypesParamTypesFieldProvider);
  }));

  describe('constructor', function () {
    it('it is an instance of BaseAggParam', function () {
      let aggParam = new FieldAggParam({
        name: 'field'
      });

      expect(aggParam).to.be.a(BaseAggParam);
    });
  });
});
