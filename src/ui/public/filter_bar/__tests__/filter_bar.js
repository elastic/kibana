import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

import MockState from 'fixtures/mock_state';
import $ from 'jquery';
import 'ui/filter_bar';
import { FilterBarLibMapFilterProvider } from 'ui/filter_bar/lib/map_filter';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';

describe('Filter Bar Directive', function () {
  let $rootScope;
  let $compile;
  let Promise;
  let appState;
  let mapFilter;
  let $el;
  let $scope;

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

    ngMock.inject(function (Private, $injector, _$rootScope_, _$compile_) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      Promise = $injector.get('Promise');
      mapFilter = Private(FilterBarLibMapFilterProvider);

      const queryFilter = Private(FilterBarQueryFilterProvider);
      queryFilter.getFilters = function () {
        return appState.filters;
      };
    });
  });

  describe('Element rendering', function () {
    beforeEach(function (done) {
      const filters = [
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

      const off = $rootScope.$on('filterbar:updated', function () {
        off();
        // force a nextTick so it continues *after* the $digest loop completes
        setTimeout(done, 0);
      });

      // kick off the digest loop
      $rootScope.$digest();
    });

    it('should render all the filters in state', function () {
      const filters = $el.find('.filter');
      expect(filters).to.have.length(5);
      expect($(filters[0]).find('span')[0].innerHTML).to.equal('_type:');
      expect($(filters[0]).find('span')[1].innerHTML).to.equal('"apache"');
      expect($(filters[1]).find('span')[0].innerHTML).to.equal('_type:');
      expect($(filters[1]).find('span')[1].innerHTML).to.equal('"nginx"');
      expect($(filters[2]).find('span')[0].innerHTML).to.equal('@timestamp:');
      expect($(filters[2]).find('span')[1].innerHTML).to.equal('"exists"');
      expect($(filters[3]).find('span')[0].innerHTML).to.equal('host:');
      expect($(filters[3]).find('span')[1].innerHTML).to.equal('"missing"');
    });

    it('should be able to set an alias', function () {
      const filter = $el.find('.filter')[4];
      expect($(filter).find('span')[0].innerHTML).to.equal('foo');
    });

    describe('editing filters', function () {
      beforeEach(function () {
        $scope.editFilter(appState.filters[3]);
        $scope.$digest();
      });

      it('should be able to edit a filter', function () {
        expect($el.find('.filter-edit-container').length).to.be(1);
      });

      it('should be able to stop editing a filter', function () {
        $scope.cancelEdit();
        $scope.$digest();
        expect($el.find('.filter-edit-container').length).to.be(0);
      });

      it('should remove old filter and add new filter when saving', function () {
        sinon.spy($scope, 'removeFilter');
        sinon.spy($scope, 'addFilters');

        $scope.saveEdit(appState.filters[3], appState.filters[3], false);
        expect($scope.removeFilter.called).to.be(true);
        expect($scope.addFilters.called).to.be(true);
      });
    });
  });
});
