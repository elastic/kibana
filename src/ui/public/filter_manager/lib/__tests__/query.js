
let fn = require('ui/filter_manager/lib/query');
let expect = require('expect.js');
let _ = require('lodash');
let ngMock = require('ngMock');
let indexPattern;
let expected;
describe('Filter Manager', function () {
  describe('Phrase filter builder', function () {
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_, Promise) {
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      expected = _.cloneDeep(require('fixtures/filter_skeleton'));
    }));

    it('should be a function', function () {
      expect(fn).to.be.a(Function);
    });

    it('should return a query filter when passed a standard field', function () {
      expected.query = {
        foo: 'bar'
      };
      expect(fn({foo: 'bar'}, indexPattern.id)).to.eql(expected);
    });

  });
});
