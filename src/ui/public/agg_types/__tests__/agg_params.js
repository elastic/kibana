import ngMock from 'ng_mock';
import expect from 'expect.js';
import { AggTypesAggParamsProvider } from 'ui/agg_types/agg_params';
import { BaseParamTypeProvider } from '../param_types/base';
import { FieldParamTypeProvider } from '../param_types/field';
import { OptionedParamTypeProvider } from '../param_types/optioned';
import { RegexParamTypeProvider } from '../param_types/regex';

describe('AggParams class', function () {

  let AggParams;
  let BaseParamType;
  let FieldParamType;
  let OptionedParamType;
  let RegexParamType;

  beforeEach(ngMock.module('kibana'));
  // stub out the param classes before we get the AggParams
  beforeEach(ngMock.inject(require('./utils/_stub_agg_params')));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    AggParams = Private(AggTypesAggParamsProvider);
    BaseParamType = Private(BaseParamTypeProvider);
    FieldParamType = Private(FieldParamTypeProvider);
    OptionedParamType = Private(OptionedParamTypeProvider);
    RegexParamType = Private(RegexParamTypeProvider);
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
    it('Uses the FieldParamType class for params with the name "field"', function () {
      const params = [
        { name: 'field' }
      ];
      const aggParams = new AggParams(params);

      expect(aggParams).to.have.length(params.length);
      expect(aggParams[0]).to.be.a(FieldParamType);
    });

    it('Uses the OptionedParamType class for params of type "optioned"', function () {
      const params = [
        {
          name: 'interval',
          type: 'optioned'
        }
      ];
      const aggParams = new AggParams(params);

      expect(aggParams).to.have.length(params.length);
      expect(aggParams[0]).to.be.a(OptionedParamType);
    });

    it('Uses the RegexParamType class for params of type "regex"', function () {
      const params = [
        {
          name: 'exclude',
          type: 'regex'
        }
      ];
      const aggParams = new AggParams(params);

      expect(aggParams).to.have.length(params.length);
      expect(aggParams[0]).to.be.a(RegexParamType);
    });

    it('Always converts the params to a BaseParamType', function () {
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

      expect(BaseParamType).to.have.property('callCount', params.length);
      expect(FieldParamType).to.have.property('callCount', 0);
      expect(OptionedParamType).to.have.property('callCount', 0);

      expect(aggParams).to.have.length(params.length);
      aggParams.forEach(function (aggParam) {
        expect(aggParam).to.be.a(BaseParamType);
      });
    });
  });
});
