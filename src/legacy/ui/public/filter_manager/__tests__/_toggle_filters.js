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
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import MockState from 'fixtures/mock_state';
import { FilterBarQueryFilterProvider } from '../query_filter';

describe('toggle filters', function () {
  let filters;
  let queryFilter;
  let $rootScope;
  let appState;
  let globalState;

  beforeEach(ngMock.module(
    'kibana',
    'kibana/courier',
    'kibana/global_state',
    function ($provide) {
      $provide.service('indexPatterns', require('fixtures/mock_index_patterns'));

      appState = new MockState({ filters: [] });
      $provide.service('getAppState', function () {
        return function () { return appState; };
      });

      globalState = new MockState({ filters: [] });
      $provide.service('globalState', function () {
        return globalState;
      });
    }
  ));

  beforeEach(ngMock.inject(function (_$rootScope_, Private) {
    $rootScope = _$rootScope_;
    queryFilter = Private(FilterBarQueryFilterProvider);
    filters = [
      {
        query: { match: { extension: { query: 'jpg', type: 'phrase' } } },
        meta: { negate: false, disabled: false }
      },
      {
        query: { match: { '@tags': { query: 'info', type: 'phrase' } } },
        meta: { negate: false, disabled: false }
      },
      {
        query: { match: { '_type': { query: 'nginx', type: 'phrase' } } },
        meta: { negate: false, disabled: false }
      }
    ];
  }));

  describe('toggling a filter', function () {
    it('should toggle the disabled property in appState', function () {
      _.each(filters, function (filter) {
        expect(filter.meta.disabled).to.be(false);
        appState.filters.push(filter);
      });

      queryFilter.toggleFilter(filters[1]);
      expect(appState.filters[1].meta.disabled).to.be(true);
    });

    it('should toggle the disabled property in globalState', function () {
      _.each(filters, function (filter) {
        expect(filter.meta.disabled).to.be(false);
        globalState.filters.push(filter);
      });

      queryFilter.toggleFilter(filters[1]);
      expect(globalState.filters[1].meta.disabled).to.be(true);
    });

    it('should fire the update and fetch events', function () {
      const updateStub = sinon.stub();
      const fetchStub = sinon.stub();

      queryFilter.getUpdates$().subscribe({
        next: updateStub,
      });

      queryFilter.getFetches$().subscribe({
        next: fetchStub,
      });

      appState.filters = filters;
      $rootScope.$digest();

      queryFilter.toggleFilter(filters[1]);
      $rootScope.$digest();

      // this time, events should be emitted
      expect(fetchStub.called);
      expect(updateStub.called);
    });

    it('should always enable the filter', function () {
      appState.filters = filters.map(function (filter) {
        filter.meta.disabled = true;
        return filter;
      });

      expect(appState.filters[1].meta.disabled).to.be(true);
      queryFilter.toggleFilter(filters[1], false);
      expect(appState.filters[1].meta.disabled).to.be(false);
      queryFilter.toggleFilter(filters[1], false);
      expect(appState.filters[1].meta.disabled).to.be(false);
    });

    it('should always disable the filter', function () {
      globalState.filters = filters;

      expect(globalState.filters[1].meta.disabled).to.be(false);
      queryFilter.toggleFilter(filters[1], true);
      expect(globalState.filters[1].meta.disabled).to.be(true);
      queryFilter.toggleFilter(filters[1], true);
      expect(globalState.filters[1].meta.disabled).to.be(true);
    });

    it('should work without appState', function () {
      appState = undefined;
      globalState.filters = filters;

      expect(globalState.filters[1].meta.disabled).to.be(false);
      expect(queryFilter.getFilters()).to.have.length(3);
      queryFilter.toggleFilter(filters[1]);
      expect(globalState.filters[1].meta.disabled).to.be(true);
    });
  });

  describe('bulk toggling', function () {
    beforeEach(function () {
      appState.filters = filters;
      globalState.filters = _.map(_.cloneDeep(filters), function (filter) {
        filter.meta.disabled = true;
        return filter;
      });
    });

    it('should swap the enabled state for all filters', function () {
      queryFilter.toggleAll();
      _.each(appState.filters, function (filter) {
        expect(filter.meta.disabled).to.be(true);
      });
      _.each(globalState.filters, function (filter) {
        expect(filter.meta.disabled).to.be(false);
      });
    });

    it('should enable all filters', function () {
      queryFilter.toggleAll(true);
      _.each(appState.filters, function (filter) {
        expect(filter.meta.disabled).to.be(true);
      });
      _.each(globalState.filters, function (filter) {
        expect(filter.meta.disabled).to.be(true);
      });
    });

    it('should disable all filters', function () {
      queryFilter.toggleAll(false);
      _.each(appState.filters, function (filter) {
        expect(filter.meta.disabled).to.be(false);
      });
      _.each(globalState.filters, function (filter) {
        expect(filter.meta.disabled).to.be(false);
      });
    });

    it('should work without appState', function () {
      appState = undefined;
      globalState.filters = filters;

      _.each(globalState.filters, function (filter) {
        expect(filter.meta.disabled).to.be(false);
      });

      queryFilter.toggleAll();

      _.each(globalState.filters, function (filter) {
        expect(filter.meta.disabled).to.be(true);
      });
    });
  });
});
