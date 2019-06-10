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

import sinon from 'sinon';

import { Subscription } from 'rxjs';
import { FilterStateStore } from '@kbn/es-query';

import { FilterStateManager } from './filter_state_manager';
import { FilterManager } from './filter_manager';

import { getFilter } from './test_helpers/get_stub_filter';
import { StubIndexPatterns } from './test_helpers/stub_index_pattern';
import { StubState } from './test_helpers/stub_state';

jest.mock(
  'ui/chrome',
  () => ({
    getBasePath: jest.fn(() => 'path'),
    getUiSettingsClient: jest.fn(() => {
      return {
        get: () => true,
      };
    }),
  }),
  { virtual: true }
);

jest.mock('ui/new_platform', () => ({
  npSetup: {
    core: {
      uiSettings: {
        get: () => true,
      },
    },
  },
}));

describe('new_filter_manager', () => {
  let appStateStub: StubState;
  let globalStateStub: StubState;

  let updateSubscription: Subscription | undefined;
  let fetchSubscription: Subscription | undefined;
  let updateListener: sinon.SinonSpy<any[], any>;

  let filterManagerState: FilterStateManager;
  let filterManager: FilterManager;
  let indexPatterns: any;

  beforeEach(() => {
    updateListener = sinon.stub();
    appStateStub = new StubState();
    globalStateStub = new StubState();
    indexPatterns = new StubIndexPatterns();
    filterManagerState = new FilterStateManager(globalStateStub, () => {
      return appStateStub;
    });
    filterManager = new FilterManager(indexPatterns, filterManagerState);
  });

  afterEach(() => {
    if (updateSubscription) {
      updateSubscription.unsubscribe();
    }
    if (fetchSubscription) {
      fetchSubscription.unsubscribe();
    }

    filterManager.removeAll();
  });

  test('should return observable', () => {
    // expect(true).toBeTruthy();
    updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
    fetchSubscription = filterManager.getUpdates$().subscribe(updateListener);
    expect(updateSubscription).toBeInstanceOf(Subscription);
    expect(fetchSubscription).toBeInstanceOf(Subscription);
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
      await filterManager.setFilters([f1]);
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
      await filterManager.setFilters([f1]);
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
      await filterManager.setFilters([f1, f2]);
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

      await filterManager.setFilters([f1]);
      await filterManager.setFilters([f2]);

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
  });

  describe('add filters', async () => {
    test('app state should be added', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
      await filterManager.addFilters(f1);
      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(0);
      expect(updateListener.callCount).toBe(1);

      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'gender', 'female');
      await filterManager.addFilters([f2]);
      expect(filterManager.getAppFilters()).toHaveLength(2);
      expect(filterManager.getGlobalFilters()).toHaveLength(0);
      expect(updateListener.callCount).toBe(2);
    });

    test('global state should be set', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      await filterManager.addFilters(f1);
      expect(filterManager.getAppFilters()).toHaveLength(0);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      expect(updateListener.callCount).toBe(1);

      const f2 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'gender', 'female');
      await filterManager.addFilters([f2]);
      expect(filterManager.getAppFilters()).toHaveLength(0);
      expect(filterManager.getGlobalFilters()).toHaveLength(2);
      expect(updateListener.callCount).toBe(2);
    });

    test('add multiple filters at once', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'gender', 'female');
      await filterManager.addFilters([f1, f2]);
      expect(filterManager.getAppFilters()).toHaveLength(0);
      expect(filterManager.getGlobalFilters()).toHaveLength(2);
      expect(updateListener.callCount).toBe(1);
    });

    test('add same filter to global and app', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
      await filterManager.addFilters([f1, f2]);

      // FILTER SHOULD BE ADDED ONLY ONCE, TO GLOBAL
      expect(filterManager.getAppFilters()).toHaveLength(0);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      expect(updateListener.callCount).toBe(1);
    });

    test('add same filter with different values to global and app', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 38);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
      await filterManager.addFilters([f1, f2]);

      // FILTER SHOULD BE ADDED TWICE
      expect(filterManager.getAppFilters()).toHaveLength(1);
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      expect(updateListener.callCount).toBe(1);
    });

    test('add filter with no state, and force pin', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 38);
      f1.$state = undefined;

      await filterManager.addFilters([f1], true);

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

      await filterManager.addFilters([f1], false);

      // FILTER SHOULD BE APP
      const f1Output = filterManager.getFilters()[0];
      expect(f1Output.$state).toBeDefined();
      if (f1Output.$state) {
        expect(f1Output.$state.store).toBe(FilterStateStore.APP_STATE);
      }
    });
  });

  describe('remove filters', async () => {
    test('remove on empty should do nothing and not fire events', async () => {
      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      await filterManager.removeAll();
      expect(updateListener.called).toBeFalsy();
      expect(filterManager.getFilters()).toHaveLength(0);
    });

    test('remove on full should clean and fire events', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'gender', 'FEMALE');
      await filterManager.setFilters([f1, f2]);

      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      await filterManager.removeAll();
      expect(updateListener.called).toBeTruthy();
      expect(filterManager.getFilters()).toHaveLength(0);
    });

    test('remove non existing filter should do nothing and not fire events', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'gender', 'FEMALE');
      const f3 = getFilter(FilterStateStore.APP_STATE, false, false, 'country', 'US');
      await filterManager.setFilters([f1, f2]);
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
      await filterManager.setFilters([f1, f2, f3]);
      expect(filterManager.getFilters()).toHaveLength(3);

      updateSubscription = filterManager.getUpdates$().subscribe(updateListener);
      await filterManager.removeFilter(f3);
      expect(updateListener.called).toBeTruthy();
      expect(filterManager.getFilters()).toHaveLength(2);
    });
  });

  describe('invert', () => {
    test('invert to disabled', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      const f1Inverted = filterManager.invertFilter(f1);
      expect(f1Inverted.meta.negate).toBe(!f1.meta.negate);

      const f1InvertedAgain = filterManager.invertFilter(f1Inverted);
      expect(f1InvertedAgain.meta.negate).toBe(f1.meta.negate);
    });
  });

  describe('addFiltersAndChangeTimeFilter', () => {
    test('should just add filters if there is no time filter in array', async () => {
      const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      await filterManager.addFiltersAndChangeTimeFilter([f1]);
      expect(filterManager.getFilters()).toHaveLength(1);
    });

    test('TODO: should set timepicker and add filters', () => {});
  });
});
