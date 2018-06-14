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

import { store } from '../../store';
import {
  clearStagedFilters,
  embeddableIsInitialized,
  embeddableIsInitializing,
  setStagedFilter,
} from '../actions';

import { getStagedFilters } from '../../selectors';

beforeAll(() => {
  store.dispatch(embeddableIsInitializing('foo1'));
  store.dispatch(embeddableIsInitializing('foo2'));
  store.dispatch(embeddableIsInitialized({ panelId: 'foo1', metadata: {} }));
  store.dispatch(embeddableIsInitialized({ panelId: 'foo2', metadata: {} }));
});

describe('staged filters', () => {
  test('getStagedFilters initially is empty', () => {
    const stagedFilters = getStagedFilters(store.getState());
    expect(stagedFilters.length).toBe(0);
  });

  test('can set a staged filter', () => {
    store.dispatch(
      setStagedFilter({ stagedFilter: ['imafilter'], panelId: 'foo1' })
    );
    const stagedFilters = getStagedFilters(store.getState());
    expect(stagedFilters.length).toBe(1);
  });

  test('getStagedFilters returns filters for all embeddables', () => {
    store.dispatch(
      setStagedFilter({ stagedFilter: ['imafilter'], panelId: 'foo2' })
    );
    const stagedFilters = getStagedFilters(store.getState());
    expect(stagedFilters.length).toBe(2);
  });

  test('clearStagedFilters clears all filters', () => {
    store.dispatch(clearStagedFilters());
    const stagedFilters = getStagedFilters(store.getState());
    expect(stagedFilters.length).toBe(0);
  });
});
