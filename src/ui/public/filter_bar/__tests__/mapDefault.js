
describe('Filter Bar Directive', function () {
  describe('mapDefault()', function () {

    var expect = require('expect.js');
    var ngMock = require('ngMock');
    var mapDefault, $rootScope;
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      mapDefault = Private(require('ui/filter_bar/lib/mapDefault'));
    }));

    it('should return the key and value for matching filters', function (done) {
      var filter = { query: { match_all: {} } };
      mapDefault(filter).then(function (result) {
        expect(result).to.have.property('key', 'query');
        expect(result).to.have.property('value', '{"match_all":{}}');
        done();
      });
      $rootScope.$apply();
    });

    it('should return undefined for none matching', function (done) {
      var filter = { range: { gt: 0, lt: 1024 } };
      mapDefault(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
      $rootScope.$apply();
    });


  });
});