import _ from 'lodash';
import expect from 'expect.js';
import buildRangeFilter from '../lib/range';
import ngMock from 'ng_mock';
import StubbedLogstashIndexPattern from 'fixtures/stubbed_logstash_index_pattern';


describe('range filter', function () {
  describe('buildRangeFilter', function () {

    let indexPattern;

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

    it('should disallow passing both gte and gt params', function () {
      const params = {
        gt: 1000,
        gte: 1000
      };

      expect(buildRangeFilter).withArgs(indexPattern.fields.byName.bytes, params, indexPattern)
      .to.throwException(/gte and gt are mutually exclusive/);
    });

    it('should disallow passing both lte and lt params', function () {
      const params = {
        lt: 1000,
        lte: 1000
      };

      expect(buildRangeFilter).withArgs(indexPattern.fields.byName.bytes, params, indexPattern)
      .to.throwException(/lte and lt are mutually exclusive/);
    });

    it('should return a range filter object with the given params', function () {
      const params = {
        gt: 1000,
        lt: 2000
      };
      const expectedFilter = {
        meta: {
          index: indexPattern.id
        },
        range: {
          bytes: params
        }
      };

      const filter = buildRangeFilter(indexPattern.fields.byName.bytes, params, indexPattern);
      expect(_.isEqual(expectedFilter, filter)).to.be(true);
    });

    it('should return a match_all filter if both ends of the range are infinite according to javascript', function () {
      const params = {
        gt: Math.pow(10, 1000),
        lt: Math.pow(10, 1001)
      };
      const expectedFilter = {
        meta: {
          index: indexPattern.id,
          field: 'bytes'
        },
        match_all: {}
      };
      const filter = buildRangeFilter(indexPattern.fields.byName.bytes, params, indexPattern);
      expect(_.isEqual(expectedFilter, filter)).to.be(true);
    });

    it('should return a script filter if the provided field is scripted', function () {
      const params = {
        gt: 1000,
        lt: 2000
      };
      const expectedFilter = {
        meta: {
          index: indexPattern.id,
          field: 'script number'
        },
        script: {
          script: {
            inline: 'boolean gt(Supplier s, def v) {return s.get() > v} boolean lt(Supplier s, def v) {return s.get() <'
                    + ' v}gt(() -> { 1234 }, params.gt) && lt(() -> { 1234 }, params.lt)',
            params: { gt: 1000, lt: 2000, value: '>1,000 <2,000' },
            lang: 'painless'
          }
        }
      };
      const filter = buildRangeFilter(indexPattern.fields.byName['script number'], params, indexPattern);
      expect(_.isEqual(expectedFilter, filter)).to.be(true);
    });

    // todo scripted field tests
    // todo formattedValue param tests
  });
});
