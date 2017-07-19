import expect from 'expect.js';
import ngMock from 'ng_mock';
import { AggTypesParamTypesBaseProvider } from 'ui/agg_types/param_types/base';
import { AggTypesParamTypesRegexProvider } from 'ui/agg_types/param_types/regex';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('Regex', function () {

  let BaseAggParam;
  let RegexAggParam;
  let Vis;
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    BaseAggParam = Private(AggTypesParamTypesBaseProvider);
    RegexAggParam = Private(AggTypesParamTypesRegexProvider);
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  describe('constructor', function () {
    it('should be an instance of BaseAggParam', function () {
      const aggParam = new RegexAggParam({
        name: 'some_param',
        type: 'regex'
      });

      expect(aggParam).to.be.a(BaseAggParam);
      expect(aggParam).to.have.property('write');
    });
  });

  describe('write results', function () {
    let aggParam;
    let aggConfig;
    const output = { params: {} };
    const paramName = 'exclude';

    beforeEach(function () {
      const vis = new Vis(indexPattern, {
        type: 'pie',
        aggs: [
          { type: 'terms', schema: 'split', params: { field: 'extension' } },
        ]
      });
      aggConfig = vis.aggs[0];

      aggParam = new RegexAggParam({
        name: paramName,
        type: 'regex'
      });
    });

    it('should not include param in output', function () {
      aggConfig.params[paramName] = {
        pattern: ''
      };

      aggParam.write(aggConfig, output);
      expect(output).to.be.an('object');
      expect(output).to.have.property('params');
      expect(output.params).not.to.have.property(paramName);
    });

    it('should include param in output', function () {
      aggConfig.params[paramName] = {
        pattern: 'testing'
      };

      aggParam.write(aggConfig, output);
      expect(output.params).to.have.property(paramName);
      expect(output.params[paramName]).to.eql({ pattern: 'testing' });
    });
  });
});
