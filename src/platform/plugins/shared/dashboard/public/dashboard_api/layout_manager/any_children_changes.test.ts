/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { anyChildrenChanges$ } from './any_children_changes';

describe('anyChildrenChanges$', () => {
  const getChildApi = () => ({
    anyStateChange$: new Subject(),
    serializeState: jest.fn(),
    applySerializedState: jest.fn(),
  });
  const child1Api = getChildApi();
  const child2Api = getChildApi();
  const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});

  beforeEach(() => {
    children$.next({
      child1: child1Api,
      child2: child2Api,
    });
  });

  test('should emit when child has changes', (done) => {
    const subscription = anyChildrenChanges$(children$).subscribe(() => {
      subscription.unsubscribe();
      done();
    });

    child1Api.anyStateChange$.next(undefined);
  });

  test('should emit when new child has changes', (done) => {
    const subscription = anyChildrenChanges$(children$).subscribe(() => {
      subscription.unsubscribe();
      done();
    });

    const child3Api = getChildApi();
    children$.next({ ...children$.getValue(), child3: child3Api });

    child3Api.anyStateChange$.next(undefined);
  });
});
