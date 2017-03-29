import expect from 'expect.js';
import ngMock from 'ng_mock';
import FilterBarLibMapTermsProvider from 'ui/filter_bar/lib/map_terms';

describe('Filter Bar Directive', function () {
  describe('mapTerms()', function () {
    let mapTerms;
    let $rootScope;

    beforeEach(ngMock.module(
      'kibana',
      'kibana/courier',
      function ($provide) {
        $provide.service('courier', require('fixtures/mock_courier'));
      }
    ));

    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      mapTerms = Private(FilterBarLibMapTermsProvider);
    }));

    it('should return the key and value for matching filters', function (done) {
      const filter = { meta: { index: 'logstash-*' }, query: { match: { _type: { query: 'apache', type: 'phrase' } } } };
      mapTerms(filter).then(function (result) {
        expect(result).to.have.property('key', '_type');
        expect(result).to.have.property('value', 'apache');
        done();
      });
      $rootScope.$apply();
    });

    it('should return undefined for none matching', function (done) {
      const filter = { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } };
      mapTerms(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
      $rootScope.$apply();
    });

  });
});
