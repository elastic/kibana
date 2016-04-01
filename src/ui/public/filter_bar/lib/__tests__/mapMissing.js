let ngMock = require('ngMock');
let expect = require('expect.js');
describe('Filter Bar Directive', function () {
  describe('mapMissing()', function () {

    let mapMissing;

    let $rootScope;
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      mapMissing = Private(require('ui/filter_bar/lib/mapMissing'));
    }));

    it('should return the key and value for matching filters', function (done) {
      let filter = { missing: { field: '_type' } };
      mapMissing(filter).then(function (result) {
        expect(result).to.have.property('key', 'missing');
        expect(result).to.have.property('value', '_type');
        done();
      });
      $rootScope.$apply();
    });

    it('should return undefined for none matching', function (done) {
      let filter = { query: { match: { query: 'foo' } } };
      mapMissing(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
      $rootScope.$apply();
    });

  });
});
