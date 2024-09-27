/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject } from 'rxjs';
import {
  COMPARATOR_SUBJECTS_DEBOUNCE,
  initializeUnsavedChanges,
} from './initialize_unsaved_changes';
import { PublishesUnsavedChanges, StateComparators } from '@kbn/presentation-publishing';
import { waitFor } from '@testing-library/react';

interface TestState {
  key1: string;
  key2: string;
}

describe('unsavedChanges api', () => {
  const lastSavedState = {
    key1: 'original key1 value',
    key2: 'original key2 value',
  } as TestState;
  const key1$ = new BehaviorSubject(lastSavedState.key1);
  const key2$ = new BehaviorSubject(lastSavedState.key2);
  const comparators = {
    key1: [key1$, (next: string) => key1$.next(next)],
    key2: [key2$, (next: string) => key2$.next(next)],
  } as StateComparators<TestState>;
  const parentApi = {
    saveNotification$: new Subject<void>(),
  };

  let api: undefined | PublishesUnsavedChanges;
  beforeEach(() => {
    key1$.next(lastSavedState.key1);
    key2$.next(lastSavedState.key2);
    ({ api } = initializeUnsavedChanges<TestState>(lastSavedState, parentApi, comparators));
  });

  test('should have no unsaved changes after initialization', () => {
    expect(api?.unsavedChanges.value).toBeUndefined();
  });

  test('should have unsaved changes when state changes', async () => {
    key1$.next('modified key1 value');
    await waitFor(
      () =>
        expect(api?.unsavedChanges.value).toEqual({
          key1: 'modified key1 value',
        }),
      {
        interval: COMPARATOR_SUBJECTS_DEBOUNCE + 1,
      }
    );
  });

  test('should have no unsaved changes after save', async () => {
    key1$.next('modified key1 value');
    await waitFor(() => expect(api?.unsavedChanges.value).not.toBeUndefined(), {
      interval: COMPARATOR_SUBJECTS_DEBOUNCE + 1,
    });

    // trigger save
    parentApi.saveNotification$.next();

    await waitFor(() => expect(api?.unsavedChanges.value).toBeUndefined(), {
      interval: COMPARATOR_SUBJECTS_DEBOUNCE + 1,
    });
  });

  test('should have no unsaved changes after reset', async () => {
    key1$.next('modified key1 value');
    await waitFor(() => expect(api?.unsavedChanges.value).not.toBeUndefined(), {
      interval: COMPARATOR_SUBJECTS_DEBOUNCE + 1,
    });

    // trigger reset
    api?.resetUnsavedChanges();

    await waitFor(() => expect(api?.unsavedChanges.value).toBeUndefined(), {
      interval: COMPARATOR_SUBJECTS_DEBOUNCE + 1,
    });
  });
});
