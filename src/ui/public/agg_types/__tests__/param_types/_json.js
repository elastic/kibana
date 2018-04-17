import _ from 'lodash';
import expect from 'expect.js';
import { BaseParamType } from '../../param_types/base';
import { JsonParamType } from '../../param_types/json';

// eslint-disable-next-line @elastic/kibana-custom/no-default-export
export default describe('JSON', function () {
  const paramName = 'json_test';
  let aggParam;
  let aggConfig;
  let output;

  function initParamType(config) {
    config = config || {};
    const defaults = {
      name: paramName,
      type: 'json'
    };

    aggParam = new JsonParamType(_.defaults(config, defaults));
  }

  // fetch out deps
  beforeEach(function () {
    aggConfig = { params: {} };
    output = { params: {} };


    initParamType();
  });

  describe('constructor', function () {
    it('it is an instance of BaseParamType', function () {
      expect(aggParam).to.be.a(BaseParamType);
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
