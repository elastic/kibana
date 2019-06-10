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
import { PartitionedFilters } from './partitioned_filters';

import { StubState } from './test_helpers/stub_state';
import { getFilter } from './test_helpers/get_stub_filter';

describe('filter_state_manager', () => {
  let appStateStub: StubState;
  let globalStateStub: StubState;

  let subscription: Subscription | undefined;
  let updateListener: sinon.SinonSpy<any[], any>;

  let filterManagerState: FilterStateManager;

  beforeEach(() => {
    updateListener = sinon.stub();
    appStateStub = new StubState();
    globalStateStub = new StubState();
    filterManagerState = new FilterStateManager(globalStateStub, () => {
      return appStateStub;
    });
  });

  afterEach(() => {
    if (subscription) {
      subscription.unsubscribe();
    }
  });

  test('should return observable', () => {
    subscription = filterManagerState.getStateUpdated$().subscribe(updateListener);
    expect(subscription).toBeInstanceOf(Subscription);
  });

  test('should update on app state change', done => {
    subscription = filterManagerState
      .getStateUpdated$()
      .subscribe((partitionedFiltres: PartitionedFilters) => {
        expect(partitionedFiltres.appFilters).toHaveLength(1);
        expect(partitionedFiltres.globalFilters).toHaveLength(0);
        done();
      });
    const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
    appStateStub.filters.push(f1);
  });

  test('should update on global state change', done => {
    subscription = filterManagerState
      .getStateUpdated$()
      .subscribe((partitionedFiltres: PartitionedFilters) => {
        expect(partitionedFiltres.appFilters).toHaveLength(0);
        expect(partitionedFiltres.globalFilters).toHaveLength(1);
        done();
      });
    const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
    globalStateStub.filters.push(f1);
  });

  test('should update state when requested', () => {
    appStateStub.save = sinon.stub();
    globalStateStub.save = sinon.stub();

    // push a filter to global state
    const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'age', 34);
    globalStateStub.filters.push(f1);

    // push a filter to app state
    const f2 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
    appStateStub.filters.push(f2);

    // update state to be empty

    filterManagerState.updateAppState({
      globalFilters: [],
      appFilters: [],
    });

    // expect save to be called
    sinon.assert.calledOnce(appStateStub.save);
    sinon.assert.calledOnce(globalStateStub.save);

    // expect filters to be empty
    expect(appStateStub.filters).toHaveLength(0);
    expect(globalStateStub.filters).toHaveLength(0);
  });
});
