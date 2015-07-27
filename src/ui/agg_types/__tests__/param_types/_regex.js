describe('Regex', function () {
  var _ = require('lodash');
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  var BaseAggParam;
  var RegexAggParam;
  var Vis;
  var indexPattern;

  beforeEach(ngMock.module('kibana'));
  // fetch out deps
  beforeEach(ngMock.inject(function (Private) {
    BaseAggParam = Private(require('ui/agg_types/param_types/base'));
    RegexAggParam = Private(require('ui/agg_types/param_types/regex'));
    Vis = Private(require('ui/Vis'));
    indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
  }));

  describe('constructor', function () {
    it('should be an instance of BaseAggParam', function () {
      var aggParam = new RegexAggParam({
        name: 'some_param',
        type: 'regex'
      });

      expect(aggParam).to.be.a(BaseAggParam);
      expect(aggParam).to.have.property('write');
    });
  });

  describe('write results', function () {
    var aggParam;
    var aggConfig;
    var output = { params: {} };
    var paramName = 'exclude';

    beforeEach(function () {
      var vis = new Vis(indexPattern, {
        type: 'pie',
        aggs: [
          { type: 'terms', schema: 'split', params: { field: 'extension' }},
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
      expect(output.params[paramName]).not.to.have.property('flags');
    });

    it('should include flags', function () {
      aggConfig.params[paramName] = {
        pattern: 'testing',
        flags: [ 'TEST1', 'TEST2', 'TEST_RED', 'TEST_BLUE' ]
      };

      aggParam.write(aggConfig, output);
      expect(output.params).to.have.property(paramName);
      expect(output.params[paramName]).to.have.property('flags');
      expect(typeof output.params[paramName].flags).to.be('string');
      expect(output.params[paramName].flags).to.be('TEST1|TEST2|TEST_RED|TEST_BLUE');
    });
  });
});
