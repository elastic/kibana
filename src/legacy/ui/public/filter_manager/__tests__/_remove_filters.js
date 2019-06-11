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
import { getFiltersArray } from './_get_filters_array';

describe('remove filters', function () {
  let filters;
  let queryFilter;
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

  beforeEach(ngMock.inject(function (Private) {
    queryFilter = Private(FilterBarQueryFilterProvider);
    filters = getFiltersArray();
  }));

  describe('removing a filter', function () {
    it('should remove the filter from appState', async function () {
      await queryFilter.addFilters(filters, false);
      expect(appState.filters).to.have.length(3);
      queryFilter.removeFilter(filters[0]);
      expect(appState.filters).to.have.length(2);
    });

    it('should remove the filter from globalState', async function () {
      await queryFilter.addFilters(filters, true);
      expect(globalState.filters).to.have.length(3);
      queryFilter.removeFilter(filters[0]);
      expect(globalState.filters).to.have.length(2);
    });

    it('should fire the update and fetch events', async function () {
      const updateStub = sinon.stub();
      const fetchStub = sinon.stub();

      queryFilter.getUpdates$().subscribe({
        next: updateStub,
      });

      queryFilter.getFetches$().subscribe({
        next: fetchStub,
      });

      await queryFilter.addFilters(filters, false);
      queryFilter.removeFilter(filters[0]);

      // this time, events should be emitted
      expect(fetchStub.called);
      expect(updateStub.called);
    });

    it('should remove matching filters', async function () {
      await queryFilter.addFilters([filters[0], filters[1]], true);
      await queryFilter.addFilters([filters[2]], false);

      queryFilter.removeFilter(filters[0]);

      expect(globalState.filters).to.have.length(1);
      expect(appState.filters).to.have.length(1);
    });

    it('should remove matching filters by comparison', async function () {
      await queryFilter.addFilters([filters[0], filters[1]], true);
      await queryFilter.addFilters([filters[2]], false);

      queryFilter.removeFilter(_.cloneDeep(filters[0]));

      expect(globalState.filters).to.have.length(1);
      expect(appState.filters).to.have.length(1);

      queryFilter.removeFilter(_.cloneDeep(filters[2]));
      expect(globalState.filters).to.have.length(1);
      expect(appState.filters).to.have.length(0);
    });

    it('should do nothing with a non-matching filter', async function () {
      await queryFilter.addFilters([filters[0], filters[1]], true);
      await queryFilter.addFilters([filters[2]], false);

      const missedFilter = _.cloneDeep(filters[0]);
      missedFilter.meta = {
        negate: !filters[0].meta.negate
      };

      queryFilter.removeFilter(missedFilter);
      expect(globalState.filters).to.have.length(2);
      expect(appState.filters).to.have.length(1);
    });
  });

  describe('bulk removal', function () {
    it('should remove all the filters from both states', async function () {
      await queryFilter.addFilters([filters[0], filters[1]], true);
      await queryFilter.addFilters([filters[2]], false);
      expect(globalState.filters).to.have.length(2);
      expect(appState.filters).to.have.length(1);

      await queryFilter.removeAll();
      expect(globalState.filters).to.have.length(0);
      expect(appState.filters).to.have.length(0);
    });
  });
});
