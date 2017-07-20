import ngMock from 'ng_mock';
import expect from 'expect.js';
import { FilterBarLibMapMissingProvider } from 'ui/filter_bar/lib/map_missing';

describe('Filter Bar Directive', function () {
  describe('mapMissing()', function () {

    let mapMissing;

    let $rootScope;
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      mapMissing = Private(FilterBarLibMapMissingProvider);
    }));

    it('should return the key and value for matching filters', function (done) {
      const filter = { missing: { field: '_type' } };
      mapMissing(filter).then(function (result) {
        expect(result).to.have.property('key', '_type');
        expect(result).to.have.property('value', 'missing');
        done();
      });
      $rootScope.$apply();
    });

    it('should return undefined for none matching', function (done) {
      const filter = { query: { match: { query: 'foo' } } };
      mapMissing(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
      $rootScope.$apply();
    });

  });
});
