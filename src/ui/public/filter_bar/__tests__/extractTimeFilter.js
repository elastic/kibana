
describe('Filter Bar Directive', function () {
  describe('extractTimeFilter()', function () {
    var sinon = require('auto-release-sinon');
    var expect = require('expect.js');
    var ngMock = require('ngMock');
    var extractTimeFilter;
    var $rootScope;

    beforeEach(ngMock.module(
      'kibana',
      'kibana/courier',
      function ($provide) {
        $provide.service('courier', require('fixtures/mock_courier'));
      }
    ));

    beforeEach(ngMock.inject(function (Private, _$rootScope_, Promise) {
      extractTimeFilter = Private(require('ui/filter_bar/lib/extractTimeFilter'));
      $rootScope = _$rootScope_;
    }));

    it('should return the matching filter for the defualt time field', function (done) {
      var filters = [
        { meta: { index: 'logstash-*' }, query: { match: { _type:  { query: 'apache', type: 'phrase' } } } },
        { meta: { index: 'logstash-*' }, range: { 'time': { gt: 1388559600000, lt: 1388646000000 } } }
      ];
      extractTimeFilter(filters).then(function (filter) {
        expect(filter).to.eql(filters[1]);
        done();
      });
      $rootScope.$apply();
    });

    it('should not return the non-matching filter for the defualt time field', function (done) {
      var filters = [
        { meta: { index: 'logstash-*' }, query: { match: { _type:  { query: 'apache', type: 'phrase' } } } },
        { meta: { index: 'logstash-*' }, range: { '@timestamp': { gt: 1388559600000, lt: 1388646000000 } } }
      ];
      extractTimeFilter(filters).then(function (filter) {
        expect(filter).to.be(undefined);
        done();
      });
      $rootScope.$apply();
    });

  });
});
