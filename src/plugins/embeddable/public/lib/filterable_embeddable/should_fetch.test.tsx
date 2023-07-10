/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import type { FilterableEmbeddableInput } from './types';
import { shouldFetch$ } from  './should_fetch';

describe('shouldFetch$', () => {
  let input: FilterableEmbeddableInput = {
    timeRange: {
      to: 'now',
      from: 'now-15m',
    },
  };
  const subject = new BehaviorSubject(input);
  let shouldFetchCount = 0;
  let subscription;
  beforeAll(() => {
    subscription = shouldFetch$<FilterableEmbeddableInput>(subject, () => {
      return input;
    }).subscribe((newInput) => {
      shouldFetchCount++;
      input = newInput;
    });
  });

  afterAll(() => {
    if (subscription) {
      subscription.unsubscribe();
    }
  });

  test('should not fire on initial subscription', () => {
    expect(shouldFetchCount).toBe(0);
  });

  test('should not fire when there are no changes', () => {
    const initialCount = shouldFetchCount;
    subject.next();
    expect(shouldFetchCount).toBe(initialCount);
  });

  test('should fire when timeRange changes', () => {
    const initialCount = shouldFetchCount;
    input = {
      ...input,
      timeRange: {
        to: 'now',
        from: 'now-25m',
      },
    };
    subject.next();
    expect(shouldFetchCount).toBe(initialCount + 1);
  });
});

