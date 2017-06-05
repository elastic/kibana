import expect from 'expect.js';
import ngMock from 'ng_mock';
import { FilterBarLibMapQueryStringProvider } from 'ui/filter_bar/lib/map_query_string';

describe('Filter Bar Directive', function () {
  describe('mapQueryString()', function () {
    let mapQueryString;
    let $rootScope;
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      mapQueryString = Private(FilterBarLibMapQueryStringProvider);
    }));

    it('should return the key and value for matching filters', function (done) {
      const filter = { query: { query_string: { query: 'foo:bar' } } };
      mapQueryString(filter).then(function (result) {
        expect(result).to.have.property('key', 'query');
        expect(result).to.have.property('value', 'foo:bar');
        done();
      });
      $rootScope.$apply();
    });

    it('should return undefined for none matching', function (done) {
      const filter = { query: { match: { query: 'foo' } } };
      mapQueryString(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
      $rootScope.$apply();
    });

  });
});
