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
import sinon from 'sinon';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import MockState from 'fixtures/mock_state';
import { FilterBarQueryFilterProvider } from '../query_filter';

describe('remove filters', function () {
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

  describe('removing a filter', function () {
    it('should remove the filter from appState', function () {
      appState.filters = filters;
      expect(appState.filters).to.have.length(3);
      queryFilter.removeFilter(filters[0]);
      expect(appState.filters).to.have.length(2);
    });

    it('should remove the filter from globalState', function () {
      globalState.filters = filters;
      expect(globalState.filters).to.have.length(3);
      queryFilter.removeFilter(filters[0]);
      expect(globalState.filters).to.have.length(2);
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

      queryFilter.removeFilter(filters[0]);
      $rootScope.$digest();

      // this time, events should be emitted
      expect(fetchStub.called);
      expect(updateStub.called);
    });

    it('should remove matching filters', function () {
      globalState.filters.push(filters[0]);
      globalState.filters.push(filters[1]);
      appState.filters.push(filters[2]);
      $rootScope.$digest();

      queryFilter.removeFilter(filters[0]);
      $rootScope.$digest();
      expect(globalState.filters).to.have.length(1);
      expect(appState.filters).to.have.length(1);
    });

    it('should remove matching filters by comparison', function () {
      globalState.filters.push(filters[0]);
      globalState.filters.push(filters[1]);
      appState.filters.push(filters[2]);
      $rootScope.$digest();

      queryFilter.removeFilter(_.cloneDeep(filters[0]));
      $rootScope.$digest();
      expect(globalState.filters).to.have.length(1);
      expect(appState.filters).to.have.length(1);

      queryFilter.removeFilter(_.cloneDeep(filters[2]));
      $rootScope.$digest();
      expect(globalState.filters).to.have.length(1);
      expect(appState.filters).to.have.length(0);
    });

    it('should do nothing with a non-matching filter', function () {
      globalState.filters.push(filters[0]);
      globalState.filters.push(filters[1]);
      appState.filters.push(filters[2]);
      $rootScope.$digest();

      const missedFilter = _.cloneDeep(filters[0]);
      missedFilter.meta = {
        negate: !filters[0].meta.negate
      };

      queryFilter.removeFilter(missedFilter);
      $rootScope.$digest();
      expect(globalState.filters).to.have.length(2);
      expect(appState.filters).to.have.length(1);
    });
  });

  describe('bulk removal', function () {
    it('should remove all the filters from both states', function () {
      globalState.filters.push(filters[0]);
      globalState.filters.push(filters[1]);
      appState.filters.push(filters[2]);
      expect(globalState.filters).to.have.length(2);
      expect(appState.filters).to.have.length(1);

      queryFilter.removeAll();
      expect(globalState.filters).to.have.length(0);
      expect(appState.filters).to.have.length(0);
    });
  });
});
