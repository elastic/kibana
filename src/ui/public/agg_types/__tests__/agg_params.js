import ngMock from 'ng_mock';
import expect from 'expect.js';
import { AggTypesAggParamsProvider } from 'ui/agg_types/agg_params';
import { AggTypesParamTypesBaseProvider } from 'ui/agg_types/param_types/base';
import { AggTypesParamTypesFieldProvider } from 'ui/agg_types/param_types/field';
import { AggTypesParamTypesOptionedProvider } from 'ui/agg_types/param_types/optioned';
import { AggTypesParamTypesRegexProvider } from 'ui/agg_types/param_types/regex';

describe('AggParams class', function () {

  let AggParams;
  let BaseAggParam;
  let FieldAggParam;
  let OptionedAggParam;
  let RegexAggParam;

  beforeEach(ngMock.module('kibana'));
  // stub out the param classes before we get the AggParams
  beforeEach(ngMock.inject(require('./utils/_stub_agg_params')));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    AggParams = Private(AggTypesAggParamsProvider);
    BaseAggParam = Private(AggTypesParamTypesBaseProvider);
    FieldAggParam = Private(AggTypesParamTypesFieldProvider);
    OptionedAggParam = Private(AggTypesParamTypesOptionedProvider);
    RegexAggParam = Private(AggTypesParamTypesRegexProvider);
  }));

  describe('constructor args', function () {
    it('accepts an array of param defs', function () {
      const params = [
        { name: 'one' },
        { name: 'two' }
      ];
      const aggParams = new AggParams(params);

      expect(aggParams).to.have.length(params.length);
      expect(aggParams).to.be.an(Array);
      expect(aggParams.byName).to.have.keys(['one', 'two']);
    });
  });

  describe('AggParam creation', function () {
    it('Uses the FieldAggParam class for params with the name "field"', function () {
      const params = [
        { name: 'field' }
      ];
      const aggParams = new AggParams(params);

      expect(aggParams).to.have.length(params.length);
      expect(aggParams[0]).to.be.a(FieldAggParam);
    });

    it('Uses the OptionedAggParam class for params of type "optioned"', function () {
      const params = [
        {
          name: 'interval',
          type: 'optioned'
        }
      ];
      const aggParams = new AggParams(params);

      expect(aggParams).to.have.length(params.length);
      expect(aggParams[0]).to.be.a(OptionedAggParam);
    });

    it('Uses the RegexAggParam class for params of type "regex"', function () {
      const params = [
        {
          name: 'exclude',
          type: 'regex'
        }
      ];
      const aggParams = new AggParams(params);

      expect(aggParams).to.have.length(params.length);
      expect(aggParams[0]).to.be.a(RegexAggParam);
    });

    it('Always converts the params to a BaseAggParam', function () {
      const params = [
        {
          name: 'height',
          editor: '<blink>high</blink>'
        },
        {
          name: 'weight',
          editor: '<blink>big</blink>'
        },
        {
          name: 'waist',
          editor: '<blink>small</blink>'
        }
      ];
      const aggParams = new AggParams(params);

      expect(BaseAggParam).to.have.property('callCount', params.length);
      expect(FieldAggParam).to.have.property('callCount', 0);
      expect(OptionedAggParam).to.have.property('callCount', 0);

      expect(aggParams).to.have.length(params.length);
      aggParams.forEach(function (aggParam) {
        expect(aggParam).to.be.a(BaseAggParam);
      });
    });
  });
});
