import expect from 'expect.js';
import ngMock from 'ng_mock';
import { FilterBarLibMapExistsProvider } from 'ui/filter_bar/lib/map_exists';

describe('Filter Bar Directive', function () {
  describe('mapExists()', function () {

    let mapExists;
    let $rootScope;
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      mapExists = Private(FilterBarLibMapExistsProvider);
    }));

    it('should return the key and value for matching filters', function (done) {
      const filter = { exists: { field: '_type' } };
      mapExists(filter).then(function (result) {
        expect(result).to.have.property('key', '_type');
        expect(result).to.have.property('value', 'exists');
        done();
      });
      $rootScope.$apply();
    });

    it('should return undefined for none matching', function (done) {
      const filter = { query: { match: { query: 'foo' } } };
      mapExists(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
      $rootScope.$apply();
    });

  });
});
