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

import { FilterStateManager } from './filter_state_manager';

import { StubState } from './test_helpers/stub_state';
import { getFilter } from './test_helpers/get_stub_filter';
import { FilterManager, esFilters } from '../../../../../../plugins/data/public';

import { coreMock } from '../../../../../../core/public/mocks';
const setupMock = coreMock.createSetup();

setupMock.uiSettings.get.mockImplementation((key: string) => {
  return true;
});

describe('filter_state_manager', () => {
  let appStateStub: StubState;
  let globalStateStub: StubState;

  let filterManager: FilterManager;

  beforeEach(() => {
    appStateStub = new StubState();
    globalStateStub = new StubState();
    filterManager = new FilterManager(setupMock.uiSettings);
  });

  describe('app_state_undefined', () => {
    beforeEach(() => {
      // FilterStateManager is tested indirectly.
      // Therefore, we don't need it's instance.
      new FilterStateManager(
        globalStateStub,
        () => {
          return undefined;
        },
        filterManager
      );
    });

    test('should NOT watch state until both app and global state are defined', done => {
      const f1 = getFilter(esFilters.FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
      globalStateStub.filters.push(f1);

      setTimeout(() => {
        expect(filterManager.getGlobalFilters()).toHaveLength(0);
        done();
      }, 100);
    });

    test('should NOT update app URL when filter manager filters are set', async () => {
      appStateStub.save = sinon.stub();
      globalStateStub.save = sinon.stub();

      const f1 = getFilter(esFilters.FilterStateStore.APP_STATE, false, false, 'age', 34);
      const f2 = getFilter(esFilters.FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);

      filterManager.setFilters([f1, f2]);

      sinon.assert.notCalled(appStateStub.save);
      sinon.assert.calledOnce(globalStateStub.save);
    });
  });

  describe('app_state_defined', () => {
    let filterStateManager: FilterStateManager;
    beforeEach(() => {
      // FilterStateManager is tested indirectly.
      // Therefore, we don't need it's instance.
      filterStateManager = new FilterStateManager(
        globalStateStub,
        () => {
          return appStateStub;
        },
        filterManager
      );
    });

    afterEach(() => {
      filterStateManager.destroy();
    });

    test('should update filter manager global filters', done => {
      const updateSubscription = filterManager.getUpdates$().subscribe(() => {
        expect(filterManager.getGlobalFilters()).toHaveLength(1);
        if (updateSubscription) {
          updateSubscription.unsubscribe();
        }
        done();
      });

      const f1 = getFilter(esFilters.FilterStateStore.GLOBAL_STATE, true, true, 'age', 34);
      globalStateStub.filters.push(f1);
    });

    test('should update filter manager app filter', done => {
      const updateSubscription = filterManager.getUpdates$().subscribe(() => {
        expect(filterManager.getAppFilters()).toHaveLength(1);
        if (updateSubscription) {
          updateSubscription.unsubscribe();
        }
        done();
      });

      const f1 = getFilter(esFilters.FilterStateStore.APP_STATE, false, false, 'age', 34);
      appStateStub.filters.push(f1);
    });

    test('should update URL when filter manager filters are set', () => {
      appStateStub.save = sinon.stub();
      globalStateStub.save = sinon.stub();

      const f1 = getFilter(esFilters.FilterStateStore.APP_STATE, false, false, 'age', 34);
      const f2 = getFilter(esFilters.FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);

      filterManager.setFilters([f1, f2]);

      sinon.assert.calledOnce(appStateStub.save);
      sinon.assert.calledOnce(globalStateStub.save);
    });

    test('should update URL when filter manager filters are added', () => {
      appStateStub.save = sinon.stub();
      globalStateStub.save = sinon.stub();

      const f1 = getFilter(esFilters.FilterStateStore.APP_STATE, false, false, 'age', 34);
      const f2 = getFilter(esFilters.FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);

      filterManager.addFilters([f1, f2]);

      sinon.assert.calledOnce(appStateStub.save);
      sinon.assert.calledOnce(globalStateStub.save);
    });
  });

  describe('bug fixes', () => {
    /*
     ** This test is here to reproduce a bug where a filter manager update
     ** would cause filter state manager detects those changes
     ** And triggers *another* filter manager update.
     */
    test('should NOT re-trigger filter manager', done => {
      const f1 = getFilter(esFilters.FilterStateStore.APP_STATE, false, false, 'age', 34);
      filterManager.setFilters([f1]);
      const setFiltersSpy = sinon.spy(filterManager, 'setFilters');

      f1.meta.negate = true;
      filterManager.setFilters([f1]);

      setTimeout(() => {
        expect(setFiltersSpy.callCount).toEqual(1);
        done();
      }, 100);
    });
  });
});
