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

import { Filter, FilterStateStore } from '@kbn/es-query';

import { FilterManager } from './new_filter_manager';
import { Subscription } from 'rxjs';

function getFilter(
  store: FilterStateStore,
  disabled: boolean,
  negated: boolean,
  queryKey: string,
  queryValue: any
): Filter {
  return {
    $state: {
      store,
    },
    meta: {
      disabled,
      negate: negated,
      alias: null,
    },
    query: {
      match: {
        [queryKey]: queryValue,
      },
    },
  };
}

describe('new_filter_manager', () => {
  const filterManager = new FilterManager([], []);
  let updateListener: sinon.SinonSpy<any[], any>;
  let subscription: Subscription;

  beforeEach(() => {
    updateListener = sinon.stub();
    subscription = filterManager.getUpdates$().subscribe(updateListener);
  });

  afterEach(() => {
    filterManager.removeAll();
    subscription.unsubscribe();
  });

  test('should be empty', () => {
    expect(filterManager.getAppFilters()).toHaveLength(0);
    expect(filterManager.getGlobalFilters()).toHaveLength(0);
  });

  test('should invert filter', () => {
    const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
    const f2 = filterManager.invertFilter(f1);
    expect(f2.meta.negate).toBe(!f1.meta.negate);
    const f3 = filterManager.invertFilter(f2);
    expect(f3.meta.negate).toBe(f1.meta.negate);
  });

  test('remove all should clear filters', () => {
    const f1 = getFilter(FilterStateStore.APP_STATE, false, false, 'age', 34);
    const f2 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'country', 'US');
    filterManager.addFilters([f1, f2], false);
    filterManager.removeAll();
    expect(filterManager.getAppFilters()).toHaveLength(0);
    expect(filterManager.getGlobalFilters()).toHaveLength(0);
  });

  test('should add filter to app state and update', () => {
    const f = getFilter(FilterStateStore.APP_STATE, false, false, 'country', 'US');
    filterManager.addFilters(f, false);
    expect(filterManager.getAppFilters()).toHaveLength(1);
    expect(filterManager.getGlobalFilters()).toHaveLength(0);
    sinon.assert.calledOnce(updateListener);
  });

  test('should add filter to global state and update', () => {
    const f = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'country', 'US');
    filterManager.addFilters(f, true);
    expect(filterManager.getAppFilters()).toHaveLength(0);
    expect(filterManager.getGlobalFilters()).toHaveLength(1);
    sinon.assert.calledOnce(updateListener);
  });

  test('should add existing filter to app state and NOT update', () => {
    const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'country', 'US');
    const f2 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'country', 'US');
    filterManager.addFilters(f1, true);
    filterManager.addFilters(f2, true);
    expect(filterManager.getAppFilters()).toHaveLength(0);
    expect(filterManager.getGlobalFilters()).toHaveLength(1);
    sinon.assert.calledOnce(updateListener);
  });

  test('should add filter multiple filters from array', () => {
    const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'country', 'US');
    const f2 = getFilter(FilterStateStore.GLOBAL_STATE, true, false, 'age', 34);
    const f3 = getFilter(FilterStateStore.GLOBAL_STATE, false, true, 'gender', 'FEMALE');
    filterManager.addFilters([f1, f2, f3], true);
    expect(filterManager.getAppFilters()).toHaveLength(0);
    expect(filterManager.getGlobalFilters()).toHaveLength(3);
    sinon.assert.calledOnce(updateListener);
  });

  test('should add filter miltiple filters one by one', () => {
    const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'country', 'US');
    const f2 = getFilter(FilterStateStore.GLOBAL_STATE, true, false, 'age', 34);
    const f3 = getFilter(FilterStateStore.GLOBAL_STATE, false, true, 'gender', 'FEMALE');
    filterManager.addFilters([f1], true);
    filterManager.addFilters([f2], true);
    filterManager.addFilters(f3, true);
    expect(filterManager.getAppFilters()).toHaveLength(0);
    expect(filterManager.getGlobalFilters()).toHaveLength(3);
    sinon.assert.calledThrice(updateListener);
  });

  test('should toggle disabled prop and post updates', () => {
    const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'country', 'US');
    const f2 = getFilter(FilterStateStore.GLOBAL_STATE, true, false, 'country', 'US');
    filterManager.addFilters(f1, true);
    filterManager.addFilters(f2, true);
    sinon.assert.calledTwice(updateListener);

    // toggle disabled to true
    let curFilters = filterManager.getGlobalFilters();
    expect(curFilters).toHaveLength(1);
    expect(curFilters[0].meta.disabled).toBeTruthy();

    // toggle disabled back to false
    filterManager.addFilters(f1, true);
    sinon.assert.calledThrice(updateListener);
    curFilters = filterManager.getGlobalFilters();
    expect(curFilters).toHaveLength(1);
    expect(curFilters[0].meta.disabled).toBeFalsy();
  });

  test('should toggle negate prop and post updates', () => {
    const f1 = getFilter(FilterStateStore.GLOBAL_STATE, false, false, 'country', 'US');
    const f2 = getFilter(FilterStateStore.GLOBAL_STATE, false, true, 'country', 'US');
    filterManager.addFilters(f1, false);
    filterManager.addFilters(f2, false);
    sinon.assert.calledTwice(updateListener);

    // toggle negate to true
    let curFilters = filterManager.getAppFilters();
    expect(curFilters).toHaveLength(1);
    expect(curFilters[0].meta.negate).toBeTruthy();

    // toggle negate back to false
    filterManager.addFilters(f1, false);
    sinon.assert.calledThrice(updateListener);
    curFilters = filterManager.getAppFilters();
    expect(curFilters).toHaveLength(1);
    expect(curFilters[0].meta.negate).toBeFalsy();
  });

  // test('should set disabled global filters and update', done => {
  // });

  // test('should set new app filters and update', done => {
  // });

  // test('should set new global filters and update', done => {
  // });

  // test('should set pinned filters and update', done => {
  // });

  // test('should set same filters and NOT update', done => {
  // });

  // test('should set same filters and NOT update', done => {
  // });

  // test('should remove all filters and update', done => {
  // });

  // test('should remove all filters when non are present and NOT update', done => {
  // });
});
