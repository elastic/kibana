
var fn = require('ui/filter_manager/lib/range');
var expect = require('expect.js');
var _ = require('lodash');
var ngMock = require('ngMock');
var indexPattern;
var expected;
describe('Filter Manager', function () {
  describe('Range filter builder', function () {
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_, Promise) {
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      expected = _.cloneDeep(require('fixtures/filter_skeleton'));
    }));

    it('should be a function', function () {
      expect(fn).to.be.a(Function);
    });

    it('should return a range filter when passed a standard field', function () {
      expected.range = {
        bytes: {
          gte: 1,
          lte: 3
        }
      };
      expect(fn(indexPattern.fields.byName.bytes, {gte: 1, lte: 3}, indexPattern)).to.eql(expected);
    });

    it('should return a script filter when passed a scripted field', function () {
      expected.meta.field = 'script number';
      expected.script = {
        lang: 'expression',
        script: '(' + indexPattern.fields.byName['script number'].script + ')>=gte && (' +
          indexPattern.fields.byName['script number'].script + ')<=lte',
        params: {
          value: '>=1 <=3',
          gte: 1,
          lte: 3
        }
      };
      expect(fn(indexPattern.fields.byName['script number'], {gte: 1, lte: 3}, indexPattern)).to.eql(expected);
    });

    it('should throw an error when gte and gt, or lte and lt are both passed', function () {
      expect(function () {
        fn(indexPattern.fields.byName['script number'], {gte: 1, gt: 3}, indexPattern);
      }).to.throwError();
      expect(function () {
        fn(indexPattern.fields.byName['script number'], {lte: 1, lt: 3}, indexPattern);
      }).to.throwError();
    });

    it('to use the right operator for each of gte, gt, lt and lte', function () {
      _.each({gte: '>=', gt: '>', lte: '<=', lt: '<'}, function (operator, key) {
        var params = {};
        params[key] = 5;
        var filter = fn(indexPattern.fields.byName['script number'], params, indexPattern);

        expect(filter.script.script).to.be('(' + indexPattern.fields.byName['script number'].script + ')' + operator + key);
        expect(filter.script.params[key]).to.be(5);
        expect(filter.script.params.value).to.be(operator + 5);

      });
    });
  });
});
