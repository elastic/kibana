
describe('Filter Bar Directive', function () {
  describe('mapTerms()', function () {
    var sinon = require('auto-release-sinon');
    var expect = require('expect.js');
    var ngMock = require('ngMock');
    var mapTerms, $rootScope;

    beforeEach(ngMock.module(
      'kibana',
      'kibana/courier',
      function ($provide) {
        $provide.service('courier', require('fixtures/mock_courier'));
      }
    ));

    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      mapTerms = Private(require('ui/filter_bar/lib/mapTerms'));
    }));

    it('should return the key and value for matching filters', function (done) {
      var filter = { meta: { index: 'logstash-*' }, query: { match: { _type: { query: 'apache', type: 'phrase' } } } };
      mapTerms(filter).then(function (result) {
        expect(result).to.have.property('key', '_type');
        expect(result).to.have.property('value', 'apache');
        done();
      });
      $rootScope.$apply();
    });

    it('should return undefined for none matching', function (done) {
      var filter = { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } };
      mapTerms(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
      $rootScope.$apply();
    });

  });
});
