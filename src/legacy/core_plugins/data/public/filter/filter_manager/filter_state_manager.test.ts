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

import { FilterStateStore } from '@kbn/es-query';

import { Subscription } from 'rxjs';
import { FilterStateManager } from './filter_state_manager';

import { StubState } from './test_helpers/stub_state';
import { getFilter } from './test_helpers/get_stub_filter';
import { FilterManager } from './filter_manager';
import { StubIndexPatterns } from './test_helpers/stub_index_pattern';

jest.mock('ui/new_platform', () => ({
  npStart: {
    core: {
      chrome: {
        recentlyAccessed: false,
      },
    },
  },
  npSetup: {
    core: {
      uiSettings: {
        get: () => true,
      },
    },
  },
}));

describe('filter_state_manager', () => {
  let appStateStub: StubState;
  let globalStateStub: StubState;

  let subscription: Subscription | undefined;
  let filterManager: FilterManager;

  beforeEach(() => {
    appStateStub = new StubState();
    globalStateStub = new StubState();
    const indexPatterns = new StubIndexPatterns();
    filterManager = new FilterManager(indexPatterns);

    // FilterStateManager is tested indirectly.
    // Therefore, we don't need it's instance.
    new FilterStateManager(
      globalStateStub,
      () => {
        return appStateStub;
      },
      filterManager
    );
  });

  afterEach(() => {
    if (subscription) {
      subscription.unsubscribe();
    }
  });

  test('should update filter manager global filters', done => {
    const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
    globalStateStub.filters.push(f1);

    setTimeout(() => {
      expect(filterManager.getGlobalFilters()).toHaveLength(1);
      done();
    }, 100);
  });

  test('should update filter manager app filters', done => {
    expect(filterManager.getAppFilters()).toHaveLength(0);

    const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
    appStateStub.filters.push(f1);

    setTimeout(() => {
      expect(filterManager.getAppFilters()).toHaveLength(1);
      done();
    }, 100);
  });

  test('should update URL when filter manager filters are set', async () => {
    appStateStub.save = sinon.stub();
    globalStateStub.save = sinon.stub();

    const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
    const f2 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);

    await filterManager.setFilters([f1, f2]);

    sinon.assert.calledOnce(appStateStub.save);
    sinon.assert.calledOnce(globalStateStub.save);
  });

  test('should update URL when filter manager filters are added', async () => {
    appStateStub.save = sinon.stub();
    globalStateStub.save = sinon.stub();

    const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
    const f2 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);

    await filterManager.addFilters([f1, f2]);

    sinon.assert.calledOnce(appStateStub.save);
    sinon.assert.calledOnce(globalStateStub.save);
  });
});
