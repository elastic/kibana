import expect from 'expect.js';
import { AggParams } from '../agg_params';
import { BaseParamType } from '../param_types/base';
import { FieldParamType } from '../param_types/field';
import { OptionedParamType } from '../param_types/optioned';
import { RegexParamType } from '../param_types/regex';

describe('AggParams class', function () {

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

      expect(aggParams).to.have.length(params.length);
      aggParams.forEach(function (aggParam) {
        expect(aggParam).to.be.a(BaseParamType);
      });
    });
  });
});
