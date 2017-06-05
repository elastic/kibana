import { buildQueryFilter } from 'ui/filter_manager/lib/query';
import expect from 'expect.js';
import _ from 'lodash';
import ngMock from 'ng_mock';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

let indexPattern;
let expected;

describe('Filter Manager', function () {
  describe('Phrase filter builder', function () {
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      expected = _.cloneDeep(require('fixtures/filter_skeleton'));
    }));

    it('should be a function', function () {
      expect(buildQueryFilter).to.be.a(Function);
    });

    it('should return a query filter when passed a standard field', function () {
      expected.query = {
        foo: 'bar'
      };
      expect(buildQueryFilter({ foo: 'bar' }, indexPattern.id)).to.eql(expected);
    });

  });
});
