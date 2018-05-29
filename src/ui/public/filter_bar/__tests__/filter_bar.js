/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

import MockState from 'fixtures/mock_state';
import $ from 'jquery';
import '..';
import { FilterBarLibMapFilterProvider } from '../lib/map_filter';
import { FilterBarQueryFilterProvider } from '../query_filter';

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

    describe('show and hide filters', function () {
      let scope;

      beforeEach(() => {
        scope = $rootScope.$new();
      });

      function create(attrs) {
        const template = `
        <div
        class="filter-bar filter-panel"
        ng-class="filterNavToggle.isOpen == true ? '' : 'filter-panel-close'">
          <div
            class="filter-link pull-right"
            ng-class="filterNavToggle.isOpen == true ? '' : 'action-show'"
            ng-show="filters.length">
          </div>
          <div
            class="filter-nav-link__icon"
            tooltip="{{ filterNavToggle.tooltipContent }}"
            tooltip-placement="left"
            tooltip-popup-delay="0"
            tooltip-append-to-body="1"
            ng-show="filters.length"
            ng-class="filterNavToggle.isOpen == true ? '' : 'filter-nav-link--close'"
            aria-hidden="!filters.length"
          >
          </div>
        </div>`;

        const element = $compile(template)(scope);

        scope.$apply(() => {
          Object.assign(scope, attrs);
        });

        return element;
      }


      describe('collapse filters', function () {
        let element;

        beforeEach(function () {
          element = create({
            filterNavToggle: {
              isOpen: false
            }
          });
        });

        it('should be able to collapse filters', function () {
          expect(element.hasClass('filter-panel-close')).to.be(true);
        });

        it('should be able to see `actions`', function () {
          expect(element.find('.filter-link.pull-right').hasClass('action-show')).to.be(true);
        });

        it('should be able to view the same button for `expand`', function () {
          expect(element.find('.filter-nav-link__icon').hasClass('filter-nav-link--close')).to.be(true);
        });
      });

      describe('expand filters', function () {
        let element;

        beforeEach(function () {
          element = create({
            filterNavToggle: {
              isOpen: true
            }
          });
        });

        it('should be able to expand filters', function () {
          expect(element.hasClass('filter-panel-close')).to.be(false);
        });

        it('should be able to view the `actions` at the bottom of the filter-bar', function () {
          expect(element.find('.filter-link.pull-right').hasClass('action-show')).to.be(false);
        });

        it('should be able to view the same button for `collapse`', function () {
          expect(element.find('.filter-nav-link__icon').hasClass('filter-nav-link--close')).to.be(false);
        });
      });

    });

  });
});
