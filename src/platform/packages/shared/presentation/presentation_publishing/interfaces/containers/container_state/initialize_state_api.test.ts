/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { initializeStateApi } from './initialize_state_api';

interface SortState {
  sort?: { by: '_count' | '_key' };
  source?: 'esql' | 'field';
}

const createStateApi = (normalizeSerializedState?: (state: SortState) => SortState) =>
  initializeStateApi<SortState>({
    uuid: 'panel-1',
    parentApi: {},
    serializeState: () => ({}),
    applySerializedState: () => {},
    anyStateChange$: of(undefined),
    getComparators: () => ({ sort: 'deepEquality', source: 'referenceEquality' }),
    normalizeSerializedState,
  });

describe('initializeStateApi compareSerializedState', () => {
  const written: SortState = { source: 'esql', sort: { by: '_count' } };
  const loaded: SortState = { source: 'esql', sort: { by: '_key' } };

  it('compares the serialized states as they are by default', () => {
    expect(createStateApi().compareSerializedState(written, loaded)).toBe(false);
  });

  it('compares both states the way the embeddable normalizes them when it loads them', () => {
    const stateApi = createStateApi((state) =>
      state.source === 'esql' ? { ...state, sort: { by: '_key' } } : state
    );

    expect(stateApi.compareSerializedState(written, loaded)).toBe(true);
  });
});
