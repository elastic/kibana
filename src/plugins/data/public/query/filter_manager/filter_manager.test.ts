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

import { Subscription } from 'rxjs';
import { FilterManager } from './filter_manager';
import { getFilter } from './test_helpers/get_stub_filter';
import { getFiltersArray } from './test_helpers/get_filters_array';
import { Filter, FilterStateStore } from '../../../common';

import { coreMock } from '../../../../../core/public/mocks';
const setupMock = coreMock.createSetup();

const uiSettingsMock = (pinnedByDefault: boolean) => (key: string) => {
  switch (key) {
    case 'filters:pinnedByDefault':
      return pinnedByDefault;
    default:
      throw new Error(`Unexpected uiSettings key in FilterManager mock: ${key}`);
  }
};

setupMock.uiSettings.get.mockImplementation(uiSettingsMock(true));

describe('filter_manager', () => {
  let updateSubscription: Subscription | undefined;
  let fetchSubscription: Subscription | undefined;
  let updateListener: sinon.SinonSpy<any[], any>;

  let filterManager: FilterManager;
  let readyFilters: Filter[];

  beforeEach(() => {
    updateListener = sinon.stub();
    filterManager = new FilterManager(setupMock.uiSettings);
    readyFilters = getFiltersArray();
  });

  afterEach(async () => {
    if (updateSubscription) {
      updateSubscription.unsubscribe();
    }
    if (fetchSubscription) {
      fetchSubscription.unsubscribe();
    }

    filterManager.removeAll();
  });

  describe('observing', () => {
    test('should return observable', () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      fetchSubscription = filterManager.getUpdates$().subscribe(() => {});
      expect(updateSubscription).toBeInstanceOf(Subscription);
      expect(fetchSubscription).toBeInstanceOf(Subscription);
    });
  });

  describe('get \\ set filters', () => {
    test('should be empty', () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      expect(filterManager.getAppFilters()).toHaveLength(0);
      expect(filterManager.getGlobalFilters()).toHaveLength(0);
      expect(filterManager.getFilters()).toHaveLength(0);

      const partitionedFiltres = filterManager.getPartitionedFilters();
      expect(partitionedFiltres.appFilters).toHaveLength(0);
      expect(partitionedFiltres.globalFilters).toHaveLength(0);
      expect(updateListener.called).toBeFalsy();
    });

    test('app state should be set', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
      filterManager.setFilters([f1]);
      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(0);
      expect(filterManager.getFilters()).toHaveLength(1);

      const partitionedFiltres = filterManager.getPartitionedFilters();
      expect(partitionedFiltres.appFilters).toHaveLength(1);
      expect(partitionedFiltres.globalFilters).toHaveLength(0);
      expect(updateListener.called).toBeTruthy();
    });

    test('global state should be set', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      filterManager.setFilters([f1]);
      expect(filterManager.getAppFilters()).toHaveLength(0);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      expect(filterManager.getFilters()).toHaveLength(1);

      const partitionedFiltres = filterManager.getPartitionedFilters();
      expect(partitionedFiltres.appFilters).toHaveLength(0);
      expect(partitionedFiltres.globalFilters).toHaveLength(1);
      expect(updateListener.called).toBeTruthy();
    });

    test('both states should be set', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'gender', 'FEMALE');
      filterManager.setFilters([f1, f2]);
      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      expect(filterManager.getFilters()).toHaveLength(2);

      const partitionedFiltres = filterManager.getPartitionedFilters();
      expect(partitionedFiltres.appFilters).toHaveLength(1);
      expect(partitionedFiltres.globalFilters).toHaveLength(1);

      // listener should be called just once
      expect(updateListener.called).toBeTruthy();
      expect(updateListener.callCount).toBe(1);
    });

    test('set state should override previous state', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'gender', 'FEMALE');

      filterManager.setFilters([f1]);
      filterManager.setFilters([f2]);

      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(0);
      expect(filterManager.getFilters()).toHaveLength(1);

      const partitionedFiltres = filterManager.getPartitionedFilters();
      expect(partitionedFiltres.appFilters).toHaveLength(1);
      expect(partitionedFiltres.globalFilters).toHaveLength(0);

      // listener should be called just once
      expect(updateListener.called).toBeTruthy();
      expect(updateListener.callCount).toBe(2);
    });

    test('changing a disabled filter should fire only update event', async function() {
      const updateStub = jest.fn();
      const fetchStub = jest.fn();
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, true, false, 'age', 34);

      filterManager.setFilters([f1]);

      filterManager.getUpdates$().subscribe({
        next: updateStub,
      });

      filterManager.getFetches$().subscribe({
        next: fetchStub,
      });

      const f2 = _.cloneDeep(f1);
      f2.meta.negate = true;
      filterManager.setFilters([f2]);

      // this time, events should be emitted
      expect(fetchStub).toBeCalledTimes(0);
      expect(updateStub).toBeCalledTimes(1);
    });

    test('should merge multiple conflicting app filters', async function() {
      filterManager.addFilters(readyFilters, true);
      const appFilter1 = _.cloneDeep(readyFilters[1]);
      appFilter1.meta.negate = true;
      appFilter1.$state = {
        store: FilterStateStore.APP_STATE,
      };
      const appFilter2 = _.cloneDeep(readyFilters[2]);
      appFilter2.meta.negate = true;
      appFilter2.$state = {
        store: FilterStateStore.APP_STATE,
      };

      const globalFilters = filterManager.getFilters();
      filterManager.setFilters([...globalFilters, appFilter1, appFilter2]);

      // global filters are taking precedence over same app filters when setting
      const res = filterManager.getFilters();
      expect(res).toHaveLength(3);
      expect(
        res.filter(function(filter) {
          return filter.$state && filter.$state.store === FilterStateStore.GLOBAL_STATE;
        }).length
      ).toBe(3);
    });

    test('should set app filters and remove any duplicated global filters', async function() {
      filterManager.addFilters(readyFilters, true);
      const appFilter1 = _.cloneDeep(readyFilters[1]);
      const appFilter2 = _.cloneDeep(readyFilters[2]);

      filterManager.setAppFilters([appFilter1, appFilter2]);

      const newGlobalFilters = filterManager.getGlobalFilters();
      const newAppFilters = filterManager.getAppFilters();

      expect(newGlobalFilters).toHaveLength(1);
      expect(newAppFilters).toHaveLength(2);
    });

    test('should set global filters and remove any duplicated app filters', async function() {
      filterManager.addFilters(readyFilters, false);
      const globalFilter1 = _.cloneDeep(readyFilters[1]);
      const globalFilter2 = _.cloneDeep(readyFilters[2]);

      filterManager.setGlobalFilters([globalFilter1, globalFilter2]);

      const newGlobalFilters = filterManager.getGlobalFilters();
      const newAppFilters = filterManager.getAppFilters();

      expect(newGlobalFilters).toHaveLength(2);
      expect(newAppFilters).toHaveLength(1);
    });

    test('set filter with no state, and force pin', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 38);
      f1.$state = undefined;

      filterManager.setFilters([f1], true);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      expect(filterManager.getAppFilters()).toHaveLength(0);
    });

    test('set filter with no state, and no pin', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 38);
      f1.$state = undefined;

      filterManager.setFilters([f1], false);
      expect(filterManager.getGlobalFilters()).toHaveLength(0);
      expect(filterManager.getAppFilters()).toHaveLength(1);
    });

    test('set filters with default pin', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 38);
      f1.$state = undefined;
      setupMock.uiSettings.get.mockImplementationOnce(uiSettingsMock(true));

      filterManager.setFilters([f1]);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      expect(filterManager.getAppFilters()).toHaveLength(0);
    });

    test('set filters without default pin', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 38);
      f1.$state = undefined;

      setupMock.uiSettings.get.mockImplementationOnce(uiSettingsMock(false));
      filterManager.setFilters([f1]);
      expect(filterManager.getGlobalFilters()).toHaveLength(0);
      expect(filterManager.getAppFilters()).toHaveLength(1);
    });
  });

  describe('add filters', () => {
    test('app state should accept a single filter', async function() {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
      filterManager.addFilters(f1);
      const appFilters = filterManager.getAppFilters();
      expect(appFilters).toHaveLength(1);
      expect(appFilters[0]).toEqual(f1);
      expect(filterManager.getGlobalFilters()).toHaveLength(0);
      expect(updateListener.callCount).toBe(1);
    });

    test('app state should accept array and preserve order', async () => {
      const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'gender', 'female');

      filterManager.addFilters([f1]);
      filterManager.addFilters([f2]);
      const appFilters = filterManager.getAppFilters();
      expect(appFilters).toHaveLength(2);
      expect(appFilters).toEqual([f1, f2]);
      expect(filterManager.getGlobalFilters()).toHaveLength(0);
    });

    test('global state should accept a single filer', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      filterManager.addFilters(f1);
      expect(filterManager.getAppFilters()).toHaveLength(0);
      const globalFilters = filterManager.getGlobalFilters();
      expect(globalFilters).toHaveLength(1);
      expect(globalFilters[0]).toEqual(f1);
      expect(updateListener.callCount).toBe(1);
    });

    test('global state should be accept array and preserve order', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'gender', 'female');

      filterManager.addFilters([f1, f2]);
      expect(filterManager.getAppFilters()).toHaveLength(0);
      const globalFilters = filterManager.getGlobalFilters();
      expect(globalFilters).toHaveLength(2);
      expect(globalFilters).toEqual([f1, f2]);
    });

    test('mixed filters: global filters should stay in the beginning', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'gender', 'female');
      filterManager.addFilters([f1, f2]);
      const filters = filterManager.getFilters();
      expect(filters).toHaveLength(2);
      expect(filters).toEqual([f1, f2]);
    });

    test('mixed filters: global filters should move to the beginning', async () => {
      const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'gender', 'female');
      filterManager.addFilters([f1, f2]);
      const filters = filterManager.getFilters();
      expect(filters).toHaveLength(2);
      expect(filters).toEqual([f2, f1]);
    });

    test('add multiple filters at once', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'gender', 'female');
      filterManager.addFilters([f1, f2]);
      expect(filterManager.getAppFilters()).toHaveLength(0);
      expect(filterManager.getGlobalFilters()).toHaveLength(2);
      expect(updateListener.callCount).toBe(1);
    });

    test('add same filter to global and app', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
      filterManager.addFilters([f1, f2]);

      // FILTER SHOULD BE ADDED ONLY ONCE, TO GLOBAL
      expect(filterManager.getAppFilters()).toHaveLength(0);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      expect(updateListener.callCount).toBe(1);
    });

    test('add same filter with different values to global and app', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 38);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
      filterManager.addFilters([f1, f2]);

      // FILTER SHOULD BE ADDED TWICE
      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      expect(updateListener.callCount).toBe(1);
    });

    test('add filter with no state, and force pin', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 38);
      f1.$state = undefined;

      filterManager.addFilters([f1], true);

      // FILTER SHOULD BE GLOBAL
      const f1Output = filterManager.getFilters()[0];
      expect(f1Output.$state).toBeDefined();
      if (f1Output.$state) {
        expect(f1Output.$state.store).toBe(FilterStateStore.GLOBAL_STATE);
      }
    });

    test('add filter with no state, and dont force pin', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 38);
      f1.$state = undefined;

      filterManager.addFilters([f1], false);

      // FILTER SHOULD BE APP
      const f1Output = filterManager.getFilters()[0];
      expect(f1Output.$state).toBeDefined();
      if (f1Output.$state) {
        expect(f1Output.$state.store).toBe(FilterStateStore.APP_STATE);
      }
    });

    test('should return app and global filters', async function() {
      const filters = getFiltersArray();
      filterManager.addFilters(filters[0], false);
      filterManager.addFilters(filters[1], true);

      // global filters should be listed first
      let res = filterManager.getFilters();
      expect(res).toHaveLength(2);
      expect(res[0].$state && res[0].$state.store).toEqual(FilterStateStore.GLOBAL_STATE);
      expect(res[0].meta.disabled).toEqual(filters[1].meta.disabled);
      expect(res[0].query).toEqual(filters[1].query);

      expect(res[1].$state && res[1].$state.store).toEqual(FilterStateStore.APP_STATE);
      expect(res[1].meta.disabled).toEqual(filters[0].meta.disabled);
      expect(res[1].query).toEqual(filters[0].query);

      // should return updated version of filters
      filterManager.addFilters(filters[2], false);

      res = filterManager.getFilters();
      expect(res).toHaveLength(3);
    });

    test('should skip appStateStub filters that match globalStateStub filters', async function() {
      filterManager.addFilters(readyFilters, true);
      const appFilter = _.cloneDeep(readyFilters[1]);
      filterManager.addFilters(appFilter, false);

      // global filters should be listed first
      const res = filterManager.getFilters();
      expect(res).toHaveLength(3);
      _.each(res, function(filter) {
        expect(filter.$state && filter.$state.store).toBe(FilterStateStore.GLOBAL_STATE);
      });
    });

    test('should allow overwriting a positive filter by a negated one', async function() {
      // Add negate: false version of the filter
      const filter = _.cloneDeep(readyFilters[0]);
      filter.meta.negate = false;

      filterManager.addFilters(filter);
      expect(filterManager.getFilters()).toHaveLength(1);
      expect(filterManager.getFilters()[0]).toEqual(filter);

      // Add negate: true version of the same filter
      const negatedFilter = _.cloneDeep(readyFilters[0]);
      negatedFilter.meta.negate = true;

      filterManager.addFilters(negatedFilter);
      // The negated filter should overwrite the positive one
      expect(filterManager.getFilters()).toHaveLength(1);
      expect(filterManager.getFilters()[0]).toEqual(negatedFilter);
    });

    test('should allow overwriting a negated filter by a positive one', async function() {
      // Add negate: true version of the same filter
      const negatedFilter = _.cloneDeep(readyFilters[0]);
      negatedFilter.meta.negate = true;

      filterManager.addFilters(negatedFilter);

      // The negated filter should overwrite the positive one
      expect(filterManager.getFilters()).toHaveLength(1);
      expect(filterManager.getFilters()[0]).toEqual(negatedFilter);

      // Add negate: false version of the filter
      const filter = _.cloneDeep(readyFilters[0]);
      filter.meta.negate = false;

      filterManager.addFilters(filter);
      expect(filterManager.getFilters()).toHaveLength(1);
      expect(filterManager.getFilters()[0]).toEqual(filter);
    });

    test('should fire the update and fetch events', async function() {
      const updateStub = jest.fn();
      const fetchStub = jest.fn();

      filterManager.getUpdates$().subscribe({
        next: updateStub,
      });

      filterManager.getFetches$().subscribe({
        next: fetchStub,
      });

      filterManager.addFilters(readyFilters);

      // this time, events should be emitted
      expect(fetchStub).toBeCalledTimes(1);
      expect(updateStub).toBeCalledTimes(1);
    });
  });

  describe('filter reconciliation', function() {
    test('should de-dupe app filters being added', async function() {
      const newFilter = _.cloneDeep(readyFilters[1]);
      filterManager.addFilters(readyFilters, false);
      expect(filterManager.getFilters()).toHaveLength(3);

      filterManager.addFilters(newFilter, false);
      expect(filterManager.getFilters()).toHaveLength(3);
    });

    test('should de-dupe global filters being added', async function() {
      const newFilter = _.cloneDeep(readyFilters[1]);
      filterManager.addFilters(readyFilters, true);
      expect(filterManager.getFilters()).toHaveLength(3);

      filterManager.addFilters(newFilter, true);
      expect(filterManager.getFilters()).toHaveLength(3);
    });

    test('should de-dupe global filters being set', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = _.cloneDeep(f1);
      filterManager.setFilters([f1, f2]);
      expect(filterManager.getAppFilters()).toHaveLength(0);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      expect(filterManager.getFilters()).toHaveLength(1);
    });

    test('should de-dupe app filters being set', async () => {
      const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
      const f2 = _.cloneDeep(f1);
      filterManager.setFilters([f1, f2]);
      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(0);
      expect(filterManager.getFilters()).toHaveLength(1);
    });

    test('should mutate global filters on appStateStub filter changes', async function() {
      const idx = 1;
      filterManager.addFilters(readyFilters, true);

      const appFilter = _.cloneDeep(readyFilters[idx]);
      appFilter.meta.negate = true;
      appFilter.$state = {
        store: FilterStateStore.APP_STATE,
      };
      filterManager.addFilters(appFilter);
      const res = filterManager.getFilters();
      expect(res).toHaveLength(3);
      _.each(res, function(filter, i) {
        expect(filter.$state && filter.$state.store).toBe('globalState');
        // make sure global filter actually mutated
        expect(filter.meta.negate).toBe(i === idx);
      });
    });

    test('should merge conflicting app filters', async function() {
      filterManager.addFilters(readyFilters, true);
      const appFilter = _.cloneDeep(readyFilters[1]);
      appFilter.meta.negate = true;
      appFilter.$state = {
        store: FilterStateStore.APP_STATE,
      };
      filterManager.addFilters(appFilter, false);

      // global filters should be listed first
      const res = filterManager.getFilters();
      expect(res).toHaveLength(3);
      expect(
        res.filter(function(filter) {
          return filter.$state && filter.$state.store === FilterStateStore.GLOBAL_STATE;
        }).length
      ).toBe(3);
    });

    test('should enable disabled filters - global state', async function() {
      // test adding to globalStateStub
      const disabledFilters = _.map(readyFilters, function(filter) {
        const f = _.cloneDeep(filter);
        f.meta.disabled = true;
        return f;
      });
      filterManager.addFilters(disabledFilters, true);
      filterManager.addFilters(readyFilters, true);

      const res = filterManager.getFilters();
      expect(res).toHaveLength(3);
      expect(
        res.filter(function(filter) {
          return filter.meta.disabled === false;
        }).length
      ).toBe(3);
    });

    test('should enable disabled filters - app state', async function() {
      // test adding to appStateStub
      const disabledFilters = _.map(readyFilters, function(filter) {
        const f = _.cloneDeep(filter);
        f.meta.disabled = true;
        return f;
      });
      filterManager.addFilters(disabledFilters, true);
      filterManager.addFilters(readyFilters, false);

      const res = filterManager.getFilters();
      expect(res).toHaveLength(3);
      expect(
        res.filter(function(filter) {
          return filter.meta.disabled === false;
        }).length
      ).toBe(3);
    });
  });

  describe('remove filters', () => {
    test('remove on empty should do nothing and not fire events', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      filterManager.removeAll();
      expect(updateListener.called).toBeFalsy();
      expect(filterManager.getFilters()).toHaveLength(0);
    });

    test('remove on full should clean and fire events', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'gender', 'FEMALE');
      filterManager.setFilters([f1, f2]);

      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      filterManager.removeAll();
      expect(updateListener.called).toBeTruthy();
      expect(filterManager.getFilters()).toHaveLength(0);
    });

    test('remove non existing filter should do nothing and not fire events', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'gender', 'FEMALE');
      const f3 = getFilter(FilterStateStore.APP_STATE, false, false, 'country', 'US');
      filterManager.setFilters([f1, f2]);
      expect(filterManager.getFilters()).toHaveLength(2);

      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      await filterManager.removeFilter(f3);
      expect(updateListener.called).toBeFalsy();
      expect(filterManager.getFilters()).toHaveLength(2);
    });

    test('remove existing filter should remove and fire events', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'gender', 'FEMALE');
      const f3 = getFilter(FilterStateStore.APP_STATE, false, false, 'country', 'US');
      filterManager.setFilters([f1, f2, f3]);
      expect(filterManager.getFilters()).toHaveLength(3);

      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      await filterManager.removeFilter(f3);
      expect(updateListener.called).toBeTruthy();
      expect(filterManager.getFilters()).toHaveLength(2);
    });

    test('should remove the filter from appStateStub', async function() {
      filterManager.addFilters(readyFilters, false);
      expect(filterManager.getAppFilters()).toHaveLength(3);
      filterManager.removeFilter(readyFilters[0]);
      expect(filterManager.getAppFilters()).toHaveLength(2);
    });

    test('should remove the filter from globalStateStub', async function() {
      filterManager.addFilters(readyFilters, true);
      expect(filterManager.getGlobalFilters()).toHaveLength(3);
      filterManager.removeFilter(readyFilters[0]);
      expect(filterManager.getGlobalFilters()).toHaveLength(2);
    });

    test('should fire the update and fetch events', async function() {
      const updateStub = jest.fn();
      const fetchStub = jest.fn();

      filterManager.addFilters(readyFilters, false);

      filterManager.getUpdates$().subscribe({
        next: updateStub,
      });

      filterManager.getFetches$().subscribe({
        next: fetchStub,
      });

      filterManager.removeFilter(readyFilters[0]);

      // this time, events should be emitted
      expect(fetchStub).toBeCalledTimes(1);
      expect(updateStub).toBeCalledTimes(1);
    });

    test('should remove matching filters', async function() {
      filterManager.addFilters([readyFilters[0], readyFilters[1]], true);
      filterManager.addFilters([readyFilters[2]], false);

      filterManager.removeFilter(readyFilters[0]);

      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
    });

    test('should remove matching filters by comparison', async function() {
      filterManager.addFilters([readyFilters[0], readyFilters[1]], true);
      filterManager.addFilters([readyFilters[2]], false);

      filterManager.removeFilter(_.cloneDeep(readyFilters[0]));

      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);

      filterManager.removeFilter(_.cloneDeep(readyFilters[2]));
      expect(filterManager.getAppFilters()).toHaveLength(0);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
    });

    test('should do nothing with a non-matching filter', async function() {
      filterManager.addFilters([readyFilters[0], readyFilters[1]], true);
      filterManager.addFilters([readyFilters[2]], false);

      const missedFilter = _.cloneDeep(readyFilters[0]);
      missedFilter.meta.negate = !readyFilters[0].meta.negate;

      filterManager.removeFilter(missedFilter);
      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(2);
    });

    test('should remove all the filters from both states', async function() {
      filterManager.addFilters([readyFilters[0], readyFilters[1]], true);
      filterManager.addFilters([readyFilters[2]], false);
      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(2);

      filterManager.removeAll();
      expect(filterManager.getAppFilters()).toHaveLength(0);
      expect(filterManager.getGlobalFilters()).toHaveLength(0);
    });
  });

  describe('invert', () => {
    test('should fire the update and fetch events', async function() {
      filterManager.addFilters(readyFilters);
      expect(filterManager.getFilters()).toHaveLength(3);

      const updateStub = jest.fn();
      const fetchStub = jest.fn();
      filterManager.getUpdates$().subscribe({
        next: updateStub,
      });

      filterManager.getFetches$().subscribe({
        next: fetchStub,
      });

      readyFilters[1].meta.negate = !readyFilters[1].meta.negate;
      filterManager.addFilters(readyFilters[1]);
      expect(filterManager.getFilters()).toHaveLength(3);
      expect(fetchStub).toBeCalledTimes(1);
      expect(updateStub).toBeCalledTimes(1);
    });
  });
});
