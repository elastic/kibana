import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { AggTypesParamTypesBaseProvider } from 'ui/agg_types/param_types/base';
import { AggTypesParamTypesRawJsonProvider } from 'ui/agg_types/param_types/raw_json';

module.exports = describe('JSON', function () {
  const paramName = 'json_test';
  let BaseAggParam;
  let JsonAggParam;
  let aggParam;
  let aggConfig;
  let output;

  function initAggParam(config) {
    config = config || {};
    const defaults = {
      name: paramName,
      type: 'json'
    };

    aggParam = new JsonAggParam(_.defaults(config, defaults));
  }

  beforeEach(ngMock.module('kibana'));

  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    aggConfig = { params: {} };
    output = { params: {} };

    BaseAggParam = Private(AggTypesParamTypesBaseProvider);
    JsonAggParam = Private(AggTypesParamTypesRawJsonProvider);

    initAggParam();
  }));

  describe('constructor', function () {
    it('it is an instance of BaseAggParam', function () {
      expect(aggParam).to.be.a(BaseAggParam);
    });
  });

  describe('write', function () {
    it('should do nothing when param is not defined', function () {
      expect(aggConfig.params).not.to.have.property(paramName);

      aggParam.write(aggConfig, output);
      expect(output).not.to.have.property(paramName);
    });

    it('should not append param when invalid JSON', function () {
      aggConfig.params[paramName] = 'i am not json';

      aggParam.write(aggConfig, output);
      expect(aggConfig.params).to.have.property(paramName);
      expect(output).not.to.have.property(paramName);
    });

    it('should append param when valid JSON', function () {
      const jsonData = JSON.stringify({
        new_param: 'should exist in output'
      });

      output.params.existing = 'true';
      aggConfig.params[paramName] = jsonData;

      aggParam.write(aggConfig, output);
      expect(aggConfig.params).to.have.property(paramName);
      expect(output.params).to.eql({
        existing: 'true',
        new_param: 'should exist in output'
      });
    });

    it('should not overwrite existing params', function () {
      const jsonData = JSON.stringify({
        new_param: 'should exist in output',
        existing: 'should be used'
      });

      output.params.existing = 'true';
      aggConfig.params[paramName] = jsonData;

      aggParam.write(aggConfig, output);
      expect(output.params).to.eql(JSON.parse(jsonData));
    });

    it('should drop nulled params', function () {
      const jsonData = JSON.stringify({
        new_param: 'should exist in output',
        field: null
      });

      output.params.field = 'extensions';
      aggConfig.params[paramName] = jsonData;

      aggParam.write(aggConfig, output);
      expect(Object.keys(output.params)).to.contain('new_param');
      expect(Object.keys(output.params)).to.not.contain('field');
    });
  });
});
