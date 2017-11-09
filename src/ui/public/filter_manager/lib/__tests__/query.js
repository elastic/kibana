import { buildQueryFilter } from 'ui/filter_manager/lib/query';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { StubLogstashIndexPatternProvider } from 'ui/index_patterns/__tests__/stubs';

let indexPattern;
let expected;

describe('Filter Manager', function () {
  describe('Phrase filter builder', function () {
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubLogstashIndexPatternProvider);
      expected = {
        meta: {
          index: 'logstash-*'
        }
      };
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
