import expect from 'expect.js';
import buildRangeFilter from '../lib/range';
import ngMock from 'ng_mock';
import StubbedLogstashIndexPattern from 'fixtures/stubbed_logstash_index_pattern';


describe('range filter', function () {
  describe('buildRangeFilter', function () {

    let indexPattern;
    const validParams = {
      gt: 1000,
      lt: 2000,
    };

    beforeEach(ngMock.module('kibana'));
    beforeEach(function () {
      ngMock.inject(function (Private) {
        indexPattern = Private(StubbedLogstashIndexPattern);
      });
    });

    it('should require field, params, and indexPattern arguments', function () {
      expect(buildRangeFilter).to.throwException(/field is a required argument/);
      expect(buildRangeFilter).withArgs(indexPattern.fields.byName.bytes).to.throwException(/params is a required argument/);
      expect(buildRangeFilter).withArgs(indexPattern.fields.byName.bytes, {}).to.throwException(/indexPattern is a required argument/);
    });

  });
});
