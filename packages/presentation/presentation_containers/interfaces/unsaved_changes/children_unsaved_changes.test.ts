/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { childrenUnsavedChanges$, DEBOUNCE_TIME } from './children_unsaved_changes';
import { waitFor } from '@testing-library/react';

describe('childrenUnsavedChanges$', () => {
  const child1Api = {
    unsavedChanges: new BehaviorSubject<object | undefined>(undefined),
    resetUnsavedChanges: () => undefined,
  };
  const child2Api = {
    unsavedChanges: new BehaviorSubject<object | undefined>(undefined),
    resetUnsavedChanges: () => undefined,
  };
  const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});
  const onFireMock = jest.fn();

  beforeEach(() => {
    onFireMock.mockReset();
    child1Api.unsavedChanges.next(undefined);
    child2Api.unsavedChanges.next(undefined);
    children$.next({
      child1: child1Api,
      child2: child2Api,
    });
  });

  test('should emit on subscribe', async () => {
    const subscription = childrenUnsavedChanges$(children$).subscribe(onFireMock);

    await waitFor(
      () => {
        expect(onFireMock).toHaveBeenCalledTimes(1);
        const childUnsavedChanges = onFireMock.mock.calls[0][0];
        expect(childUnsavedChanges).toBeUndefined();
      },
      {
        interval: DEBOUNCE_TIME + 1,
      }
    );

    subscription.unsubscribe();
  });

  test('should emit when child has new unsaved changes', async () => {
    const subscription = childrenUnsavedChanges$(children$).subscribe(onFireMock);
    await waitFor(
      () => {
        expect(onFireMock).toHaveBeenCalledTimes(1);
      },
      {
        interval: DEBOUNCE_TIME + 1,
      }
    );

    child1Api.unsavedChanges.next({
      key1: 'modified value',
    });

    await waitFor(
      () => {
        expect(onFireMock).toHaveBeenCalledTimes(2);
        const childUnsavedChanges = onFireMock.mock.calls[1][0];
        expect(childUnsavedChanges).toEqual({
          child1: {
            key1: 'modified value',
          },
        });
      },
      {
        interval: DEBOUNCE_TIME + 1,
      }
    );

    subscription.unsubscribe();
  });

  test('should emit when children changes', async () => {
    const subscription = childrenUnsavedChanges$(children$).subscribe(onFireMock);
    await waitFor(
      () => {
        expect(onFireMock).toHaveBeenCalledTimes(1);
      },
      {
        interval: DEBOUNCE_TIME + 1,
      }
    );

    // add child
    children$.next({
      ...children$.value,
      child3: {
        unsavedChanges: new BehaviorSubject<object | undefined>({ key1: 'modified value' }),
        resetUnsavedChanges: () => undefined,
      },
    });

    await waitFor(
      () => {
        expect(onFireMock).toHaveBeenCalledTimes(2);
        const childUnsavedChanges = onFireMock.mock.calls[1][0];
        expect(childUnsavedChanges).toEqual({
          child3: {
            key1: 'modified value',
          },
        });
      },
      {
        interval: DEBOUNCE_TIME + 1,
      }
    );

    subscription.unsubscribe();
  });
});
