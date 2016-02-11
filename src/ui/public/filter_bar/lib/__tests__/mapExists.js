import expect from 'expect.js';
import ngMock from 'ngMock';
import FilterBarLibMapExistsProvider from 'ui/filter_bar/lib/mapExists';
describe('Filter Bar Directive', function () {
  describe('mapExists()', function () {

    var mapExists;
    var $rootScope;
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      mapExists = Private(FilterBarLibMapExistsProvider);
    }));

    it('should return the key and value for matching filters', function (done) {
      var filter = { exists: { field: '_type' } };
      mapExists(filter).then(function (result) {
        expect(result).to.have.property('key', 'exists');
        expect(result).to.have.property('value', '_type');
        done();
      });
      $rootScope.$apply();
    });

    it('should return undefined for none matching', function (done) {
      var filter = { query: { match: { query: 'foo' } } };
      mapExists(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
      $rootScope.$apply();
    });

  });
});
