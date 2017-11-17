import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { BaseParamTypeProvider } from '../../param_types/base';
import { StringParamTypeProvider } from '../../param_types/string';

// eslint-disable-next-line @elastic/kibana-custom/no-default-export
export default describe('String', function () {
  const paramName = 'json_test';
  let BaseParamType;
  let StringParamType;
  let aggParam;
  let aggConfig;
  let output;

  function initAggParam(config) {
    config = config || {};
    const defaults = {
      name: paramName,
      type: 'string'
    };

    aggParam = new StringParamType(_.defaults(config, defaults));
  }

  beforeEach(ngMock.module('kibana'));

  // fetch our deps
  beforeEach(ngMock.inject(function (Private) {
    BaseParamType = Private(BaseParamTypeProvider);
    StringParamType = Private(StringParamTypeProvider);

    aggConfig = { params: {} };
    output = { params: {} };
  }));

  describe('constructor', function () {
    it('it is an instance of BaseParamType', function () {
      initAggParam();
      expect(aggParam).to.be.a(BaseParamType);
    });
  });

  describe('write', function () {
    it('should append param by name', function () {
      const paramName = 'testing';
      const params = {};
      params[paramName] = 'some input';

      initAggParam({ name: paramName });

      aggConfig.params = params;
      aggParam.write(aggConfig, output);

      expect(output.params).to.eql(params);
    });

    it('should not be in output with empty input', function () {
      const paramName = 'more_testing';
      const params = {};
      params[paramName] = '';

      initAggParam({ name: paramName });

      aggConfig.params = params;
      aggParam.write(aggConfig, output);

      expect(output.params).to.eql({});
    });
  });
});
