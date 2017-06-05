import expect from 'expect.js';
import ngMock from 'ng_mock';
import { FilterBarLibMapAndFlattenFiltersProvider } from 'ui/filter_bar/lib/map_and_flatten_filters';

describe('Filter Bar Directive', function () {
  describe('mapAndFlattenFilters()', function () {
    let mapAndFlattenFilters;
    let $rootScope;

    beforeEach(ngMock.module(
      'kibana',
      'kibana/courier',
      function ($provide) {
        $provide.service('courier', require('fixtures/mock_courier'));
      }
    ));

    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      mapAndFlattenFilters = Private(FilterBarLibMapAndFlattenFiltersProvider);
      $rootScope = _$rootScope_;
    }));

    const filters = [
      null,
      [
        { meta: { index: 'logstash-*' }, exists: { field: '_type' } },
        { meta: { index: 'logstash-*' }, missing: { field: '_type' } }
      ],
      { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } },
      { meta: { index: 'logstash-*' }, range: { bytes: { lt: 2048, gt: 1024 } } },
      { meta: { index: 'logstash-*' }, query: { match: { _type: { query: 'apache', type: 'phrase' } } } }
    ];

    it('should map and flatten the filters', function (done) {
      mapAndFlattenFilters(filters).then(function (results) {
        expect(results).to.have.length(5);
        expect(results[0]).to.have.property('meta');
        expect(results[1]).to.have.property('meta');
        expect(results[2]).to.have.property('meta');
        expect(results[3]).to.have.property('meta');
        expect(results[4]).to.have.property('meta');
        expect(results[0].meta).to.have.property('key', '_type');
        expect(results[0].meta).to.have.property('value', 'exists');
        expect(results[1].meta).to.have.property('key', '_type');
        expect(results[1].meta).to.have.property('value', 'missing');
        expect(results[2].meta).to.have.property('key', 'query');
        expect(results[2].meta).to.have.property('value', 'foo:bar');
        expect(results[3].meta).to.have.property('key', 'bytes');
        expect(results[3].meta).to.have.property('value', '1,024 to 2,048');
        expect(results[4].meta).to.have.property('key', '_type');
        expect(results[4].meta).to.have.property('value', 'apache');
        done();
      });
      $rootScope.$apply();
    });

  });
});
