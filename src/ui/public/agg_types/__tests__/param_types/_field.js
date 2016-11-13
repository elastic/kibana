import expect from 'expect.js';
import ngMock from 'ng_mock';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import AggTypesParamTypesBaseProvider from 'ui/agg_types/param_types/base';
import AggTypesParamTypesFieldProvider from 'ui/agg_types/param_types/field';

describe('Field', function () {

  let BaseAggParam;
  let FieldAggParam;
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    BaseAggParam = Private(AggTypesParamTypesBaseProvider);
    FieldAggParam = Private(AggTypesParamTypesFieldProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  describe('constructor', function () {
    it('it is an instance of BaseAggParam', function () {
      let aggParam = new FieldAggParam({
        name: 'field'
      });

      expect(aggParam).to.be.a(BaseAggParam);
    });
  });

  describe('getFieldOptions', function () {
    it('should return only aggregatable fields', function () {
      const aggParam = new FieldAggParam({
        name: 'field'
      });

      const fields = aggParam.getFieldOptions({
        getIndexPattern: () => indexPattern
      });
      for (let field of fields) {
        expect(field.aggregatable).to.be(true);
      }
    });

    it('should return all fields', function () {
      const aggParam = new FieldAggParam({
        name: 'field'
      });

      aggParam.onlyAggregatable = false;

      const fields = aggParam.getFieldOptions({
        getIndexPattern: () => indexPattern
      });
      let nAggregatable = 0;
      for (let field of fields) {
        if (field.aggregatable) {
          nAggregatable++;
        }
      }
      expect(fields.length - nAggregatable > 0).to.be(true);
    });
  });
});
