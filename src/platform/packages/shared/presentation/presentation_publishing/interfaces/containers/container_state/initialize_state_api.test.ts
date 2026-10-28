/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, of } from 'rxjs';
import { initializeStateApi } from './initialize_state_api';

interface SortState {
  sort?: { by: '_count' | '_key' };
  source?: 'esql' | 'field';
}

describe('initializeStateApi hasUnsavedChanges$', () => {
  const lastSaved: SortState = { source: 'esql', sort: { by: '_count' } };

  const createChildStateApi = (current: SortState) =>
    initializeStateApi<SortState>({
      uuid: 'panel-1',
      parentApi: {
        lastSavedStateForChild$: () => of(lastSaved),
        getLastSavedStateForChild: () => lastSaved,
      },
      serializeState: () => current,
      applySerializedState: () => {},
      anyStateChange$: of(undefined),
      getComparators: () => ({ sort: 'deepEquality', source: 'referenceEquality' }),
      defaultState: { source: 'field' },
    });

  it.each([
    ['the same state', lastSaved],
    ['a changed key', { source: 'esql', sort: { by: '_key' } } as SortState],
    ['a key matching its default', { sort: { by: '_count' } } as SortState],
  ])('agrees with compareSerializedState for %s', async (_, current) => {
    const stateApi = createChildStateApi(current);

    expect(await firstValueFrom(stateApi.hasUnsavedChanges$)).toBe(
      !stateApi.compareSerializedState(lastSaved, current)
    );
  });
});
