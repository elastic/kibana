/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, skip } from 'rxjs';
import { childrenUnsavedChanges$, DEBOUNCE_TIME } from './children_unsaved_changes';

// Failing: See https://github.com/elastic/kibana/issues/189823
describe.skip('childrenUnsavedChanges$', () => {
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
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_TIME + 1));

    expect(onFireMock).toHaveBeenCalledTimes(1);
    const childUnsavedChanges = onFireMock.mock.calls[0][0];
    expect(childUnsavedChanges).toBeUndefined();

    subscription.unsubscribe();
  });

  test('should emit when child has new unsaved changes', async () => {
    const subscription = childrenUnsavedChanges$(children$).pipe(skip(1)).subscribe(onFireMock);
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_TIME + 1));
    expect(onFireMock).toHaveBeenCalledTimes(0);

    child1Api.unsavedChanges.next({
      key1: 'modified value',
    });
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_TIME + 1));

    expect(onFireMock).toHaveBeenCalledTimes(1);
    const childUnsavedChanges = onFireMock.mock.calls[0][0];
    expect(childUnsavedChanges).toEqual({
      child1: {
        key1: 'modified value',
      },
    });

    subscription.unsubscribe();
  });

  test('should emit when children changes', async () => {
    const subscription = childrenUnsavedChanges$(children$).pipe(skip(1)).subscribe(onFireMock);
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_TIME + 1));
    expect(onFireMock).toHaveBeenCalledTimes(0);

    // add child
    children$.next({
      ...children$.value,
      child3: {
        unsavedChanges: new BehaviorSubject<object | undefined>({ key1: 'modified value' }),
        resetUnsavedChanges: () => undefined,
      },
    });
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_TIME + 1));

    expect(onFireMock).toHaveBeenCalledTimes(1);
    const childUnsavedChanges = onFireMock.mock.calls[0][0];
    expect(childUnsavedChanges).toEqual({
      child3: {
        key1: 'modified value',
      },
    });

    subscription.unsubscribe();
  });
});
