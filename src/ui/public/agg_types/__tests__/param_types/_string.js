import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import AggTypesParamTypesBaseProvider from 'ui/agg_types/param_types/base';
import AggTypesParamTypesStringProvider from 'ui/agg_types/param_types/string';

module.exports = describe('String', function () {
  var paramName = 'json_test';
  let BaseAggParam;
  let StringAggParam;
  let aggParam;
  let aggConfig;
  let output;

  function initAggParam(config) {
    config = config || {};
    var defaults = {
      name: paramName,
      type: 'string'
    };

    aggParam = new StringAggParam(_.defaults(config, defaults));
  }

  beforeEach(ngMock.module('kibana'));

  // fetch our deps
  beforeEach(ngMock.inject(function (Private) {
    BaseAggParam = Private(AggTypesParamTypesBaseProvider);
    StringAggParam = Private(AggTypesParamTypesStringProvider);

    aggConfig = { params: {} };
    output = { params: {} };
  }));

  describe('constructor', function () {
    it('it is an instance of BaseAggParam', function () {
      initAggParam();
      expect(aggParam).to.be.a(BaseAggParam);
    });
  });

  describe('write', function () {
    it('should append param by name', function () {
      var paramName = 'testing';
      var params = {};
      params[paramName] = 'some input';

      initAggParam({ name: paramName });

      aggConfig.params = params;
      aggParam.write(aggConfig, output);

      expect(output.params).to.eql(params);
    });

    it('should not be in output with empty input', function () {
      var paramName = 'more_testing';
      var params = {};
      params[paramName] = '';

      initAggParam({ name: paramName });

      aggConfig.params = params;
      aggParam.write(aggConfig, output);

      expect(output.params).to.eql({});
    });
  });
});
