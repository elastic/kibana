import expect from 'expect.js';
import ngMock from 'ng_mock';
import { FilterBarLibMapRangeProvider } from 'ui/filter_bar/lib/map_range';
import { buildRangeFilter } from 'ui/filter_manager/lib/range';
import { StubbedLogstashIndexPattern } from 'fixtures/stubbed_logstash_index_pattern';

describe('Filter Bar Directive', function () {
  describe('mapRange()', function () {
    let mapRange;
    let $rootScope;
    let indexPattern;
    let bytesField;

    beforeEach(ngMock.module(
      'kibana',
      'kibana/courier',
      function ($provide) {
        $provide.service('courier', require('fixtures/mock_courier'));
      }
    ));

    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      mapRange = Private(FilterBarLibMapRangeProvider);
      $rootScope = _$rootScope_;
      indexPattern = Private(StubbedLogstashIndexPattern);
      bytesField = indexPattern.fields.byName.bytes;
    }));

    it('should return the key and value for matching filters with gt/lt', function (done) {
      const params = {
        lt: 2048,
        gt: 1024,
      };
      const filter = buildRangeFilter(bytesField, params, indexPattern);

      mapRange(filter).then(function (result) {
        expect(result).to.have.property('key', 'bytes');
        expect(result).to.have.property('value', '1,024 to 2,048');
        done();
      });
      $rootScope.$apply();
    });

    it('should return the key and value for matching filters with gte/lte', function (done) {
      const params = {
        lt: 2048,
        gt: 1024,
      };
      const filter = buildRangeFilter(bytesField, params, indexPattern);
      mapRange(filter).then(function (result) {
        expect(result).to.have.property('key', 'bytes');
        expect(result).to.have.property('value', '1,024 to 2,048');
        done();
      });
      $rootScope.$apply();
    });

    it('should return undefined for none matching', function (done) {
      const filter = { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } };
      mapRange(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
      $rootScope.$apply();
    });

  });
});
