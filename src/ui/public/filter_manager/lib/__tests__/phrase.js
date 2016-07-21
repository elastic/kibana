
var fn = require('ui/filter_manager/lib/phrase');
var expect = require('expect.js');
var _ = require('lodash');
var ngMock = require('ngMock');
var indexPattern;
var expected;
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

    it('should return a match query filter when passed a standard field', function () {
      expected.query = {
        match: {
          bytes: {
            query: 5,
            type: 'phrase'
          }
        }
      };
      expect(fn(indexPattern.fields.byName.bytes, 5, indexPattern)).to.eql(expected);
    });

    it('should return a script filter when passed a scripted field', function () {
      expected.meta.field = 'script number';
      expected.script = {
        script: '(' + indexPattern.fields.byName['script number'].script + ') == value',
        lang: 'expression',
        params: {
          value: 5,
        }
      };
      expect(fn(indexPattern.fields.byName['script number'], 5, indexPattern)).to.eql(expected);
    });
  });
});
