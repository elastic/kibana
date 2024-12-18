/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subscription } from 'rxjs';
import type { FilterableEmbeddableInput } from './types';
import { shouldFetch$ } from './should_fetch';

describe('shouldFetch$', () => {
  let shouldFetchCount = 0;
  let subscription: Subscription;
  let updateInput: (inputFragment: Partial<FilterableEmbeddableInput>) => void;
  beforeAll(() => {
    let input: FilterableEmbeddableInput = {
      id: '1',
      timeRange: {
        to: 'now',
        from: 'now-15m',
      },
    };
    const subject = new BehaviorSubject(input);
    updateInput = (inputFragment: Partial<FilterableEmbeddableInput>) => {
      input = {
        ...input,
        ...inputFragment,
      };
      subject.next(input);
    };

    subscription = shouldFetch$<FilterableEmbeddableInput>(subject, () => {
      return input;
    }).subscribe(() => {
      shouldFetchCount++;
    });
  });

  afterAll(() => {
    subscription.unsubscribe();
  });

  test('should not fire on initial subscription', () => {
    expect(shouldFetchCount).toBe(0);
  });

  test('should not fire when there are no changes', () => {
    const initialCount = shouldFetchCount;
    updateInput({});
    expect(shouldFetchCount).toBe(initialCount);
  });

  test('should fire when timeRange changes', () => {
    const initialCount = shouldFetchCount;
    updateInput({
      timeRange: {
        to: 'now',
        from: 'now-25m',
      },
    });
    expect(shouldFetchCount).toBe(initialCount + 1);
  });
});
