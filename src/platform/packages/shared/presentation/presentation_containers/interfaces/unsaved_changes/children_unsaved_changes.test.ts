/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { childrenUnsavedChanges$, DEBOUNCE_TIME } from './children_unsaved_changes';
import { waitFor } from '@testing-library/react';

describe('childrenUnsavedChanges$', () => {
  const child1Api = {
    uuid: 'child1',
    hasUnsavedChanges$: new BehaviorSubject<boolean>(false),
    resetUnsavedChanges: () => undefined,
  };
  const child2Api = {
    uuid: 'child2',
    hasUnsavedChanges$: new BehaviorSubject<boolean>(false),
    resetUnsavedChanges: () => undefined,
  };
  const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});
  const onFireMock = jest.fn();

  beforeEach(() => {
    onFireMock.mockReset();
    child1Api.hasUnsavedChanges$.next(false);
    child2Api.hasUnsavedChanges$.next(false);
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
        expect(childUnsavedChanges).toMatchInlineSnapshot(`
          Array [
            Object {
              "hasUnsavedChanges": false,
              "uuid": "child1",
            },
            Object {
              "hasUnsavedChanges": false,
              "uuid": "child2",
            },
          ]
        `);
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

    child1Api.hasUnsavedChanges$.next(true);

    await waitFor(
      () => {
        expect(onFireMock).toHaveBeenCalledTimes(2);
        const childUnsavedChanges = onFireMock.mock.calls[1][0];
        expect(childUnsavedChanges).toMatchInlineSnapshot(`
          Array [
            Object {
              "hasUnsavedChanges": true,
              "uuid": "child1",
            },
            Object {
              "hasUnsavedChanges": false,
              "uuid": "child2",
            },
          ]
        `);
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
        uuid: 'child3',
        hasUnsavedChanges$: new BehaviorSubject<boolean>(true),
        resetUnsavedChanges: () => undefined,
      },
    });

    await waitFor(
      () => {
        expect(onFireMock).toHaveBeenCalledTimes(2);
        const childUnsavedChanges = onFireMock.mock.calls[1][0];
        expect(childUnsavedChanges).toMatchInlineSnapshot(`
          Array [
            Object {
              "hasUnsavedChanges": false,
              "uuid": "child1",
            },
            Object {
              "hasUnsavedChanges": false,
              "uuid": "child2",
            },
            Object {
              "hasUnsavedChanges": true,
              "uuid": "child3",
            },
          ]
        `);
      },
      {
        interval: DEBOUNCE_TIME + 1,
      }
    );

    subscription.unsubscribe();
  });
});
