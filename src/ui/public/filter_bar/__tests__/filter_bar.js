var angular = require('angular');
var _ = require('lodash');
var $ = require('jquery');
var ngMock = require('ngMock');
var expect = require('expect.js');
var sinon = require('sinon');

require('ui/filter_bar');
var MockState = require('fixtures/mock_state');

describe('Filter Bar Directive', function () {
  var $rootScope;
  var $compile;
  var $timeout;
  var Promise;
  var appState;
  var queryFilter;
  var mapFilter;
  var $el;
  var $scope;
  // require('testUtils/noDigestPromises').activateForSuite();

  beforeEach(ngMock.module('kibana/global_state', function ($provide) {
    $provide.service('getAppState', _.constant(_.constant(
      appState = new MockState({ filters: [] })
    )));
  }));

  beforeEach(function () {
    // load the application
    ngMock.module('kibana');

    ngMock.module('kibana/courier', function ($provide) {
      $provide.service('courier', require('fixtures/mock_courier'));
    });

    ngMock.inject(function (Private, $injector, _$rootScope_, _$compile_, _$timeout_) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      $timeout = _$timeout_;
      Promise = $injector.get('Promise');
      mapFilter = Private(require('ui/filter_bar/lib/mapFilter'));

      var queryFilter = Private(require('ui/filter_bar/query_filter'));
      queryFilter.getFilters = function () {
        return appState.filters;
      };
    });
  });

  describe('Element rendering', function () {
    beforeEach(function (done) {
      var filters = [
        { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'apache' } } } },
        { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'nginx' } } } },
        { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } },
        { meta: { index: 'logstash-*' }, missing: { field: 'host' }, disabled: true },
        { meta: { index: 'logstash-*', alias: 'foo' }, query: { match: { '_type': { query: 'nginx' } } } },
      ];

      Promise.map(filters, mapFilter).then(function (filters) {
        appState.filters = filters;
        $el = $compile('<filter-bar></filter-bar>')($rootScope);
        $scope = $el.isolateScope();
      });

      var off = $rootScope.$on('filterbar:updated', function () {
        off();
        // force a nextTick so it continues *after* the $digest loop completes
        setTimeout(done, 0);
      });

      // kick off the digest loop
      $rootScope.$digest();
    });

    it('should render all the filters in state', function () {
      var filters = $el.find('.filter');
      expect(filters).to.have.length(5);
      expect($(filters[0]).find('span')[0].innerHTML).to.equal('_type:');
      expect($(filters[0]).find('span')[1].innerHTML).to.equal('"apache"');
      expect($(filters[1]).find('span')[0].innerHTML).to.equal('_type:');
      expect($(filters[1]).find('span')[1].innerHTML).to.equal('"nginx"');
      expect($(filters[2]).find('span')[0].innerHTML).to.equal('exists:');
      expect($(filters[2]).find('span')[1].innerHTML).to.equal('"@timestamp"');
      expect($(filters[3]).find('span')[0].innerHTML).to.equal('missing:');
      expect($(filters[3]).find('span')[1].innerHTML).to.equal('"host"');
    });

    it('should be able to set an alias', function () {
      var filter = $el.find('.filter')[4];
      expect($(filter).find('span')[0].innerHTML).to.equal('foo');
    });

    describe('editing filters', function () {
      beforeEach(function () {
        $scope.startEditingFilter(appState.filters[3]);
        $scope.$digest();
      });

      it('should be able to edit a filter', function () {
        expect($el.find('.filter-edit-container').length).to.be(1);
      });

      it('should be able to stop editing a filter', function () {
        $scope.stopEditingFilter();
        $scope.$digest();
        expect($el.find('.filter-edit-container').length).to.be(0);
      });

      it('should merge changes after clicking done', function () {
        sinon.spy($scope, 'updateFilter');

        $scope.editDone();
        expect($scope.updateFilter.called).to.be(true);
      });
    });
  });
});
