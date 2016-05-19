
import fn from 'ui/filter_manager/lib/range';
import expect from 'expect.js';
import _ from 'lodash';
import ngMock from 'ng_mock';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
let indexPattern;
let expected;
describe('Filter Manager', function () {
  describe('Range filter builder', function () {
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_, Promise) {
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
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
        let params = {};
        params[key] = 5;
        let filter = fn(indexPattern.fields.byName['script number'], params, indexPattern);

        expect(filter.script.script).to.be('(' + indexPattern.fields.byName['script number'].script + ')' + operator + key);
        expect(filter.script.params[key]).to.be(5);
        expect(filter.script.params.value).to.be(operator + 5);

      });
    });

    describe('when given params where one side is infinite', function () {
      let filter;
      beforeEach(function () {
        filter = fn(indexPattern.fields.byName['script number'], { gte: 0, lt: Infinity }, indexPattern);
      });

      describe('returned filter', function () {
        it('is a script filter', function () {
          expect(filter).to.have.property('script');
        });

        it('contain a param for the finite side', function () {
          expect(filter.script.params).to.have.property('gte', 0);
        });

        it('does not contain a param for the infinite side', function () {
          expect(filter.script.params).not.to.have.property('lt');
        });

        it('does not contain a script condition for the infinite side', function () {
          const script = indexPattern.fields.byName['script number'].script;
          expect(filter.script.script).to.equal(`(${script})>=gte`);
        });
      });
    });

    describe('when given params where both sides are infinite', function () {
      let filter;
      beforeEach(function () {
        filter = fn(indexPattern.fields.byName['script number'], { gte: -Infinity, lt: Infinity }, indexPattern);
      });

      describe('returned filter', function () {
        it('is a match_all filter', function () {
          expect(filter).not.to.have.property('script');
          expect(filter).to.have.property('match_all');
        });

        it('does not contain params', function () {
          expect(filter).not.to.have.property('params');
        });

        it('meta field is set to field name', function () {
          expect(filter.meta.field).to.equal('script number');
        });
      });
    });
  });
});
