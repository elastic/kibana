/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable, Subject } from 'rxjs';
import { ServiceStatusLevels } from '@kbn/core-status-common';
import type { LoggableServiceStatus } from './types';
import { createLogThrottledBuffer } from './log_throttled_buffer';

describe('createLogThrottledBuffer', () => {
  let buffer$: Subject<LoggableServiceStatus>;
  let throttled$: Observable<LoggableServiceStatus | string>;
  let loggedMessages: Array<LoggableServiceStatus | string>;

  const stop$ = new Subject<void>();
  const bufferTimeMillis = 1000;
  const maxThrottledMessages = 10;

  const baseStatus: LoggableServiceStatus = {
    name: 'test-service',
    level: ServiceStatusLevels.available,
    summary: 'this is a test',
  };

  beforeEach(() => {
    jest.useFakeTimers();
    buffer$ = new Subject<LoggableServiceStatus>();
    loggedMessages = [];
    throttled$ = createLogThrottledBuffer({
      buffer$,
      stop$,
      bufferTimeMillis,
      maxThrottledMessages,
    });
    throttled$.subscribe((message) => {
      loggedMessages.push(message);
    });
  });

  afterEach(() => {
    stop$.next();
    jest.clearAllTimers();
  });

  test('returns an observable', async () => {
    // Make sure that it doesn't expose the original buffer's `.next` method
    expect(throttled$).toBeInstanceOf(Observable);
    expect(throttled$).not.toBeInstanceOf(Subject);
    expect(throttled$).not.toHaveProperty('next');
  });

  test('buffers until at least 3 messages are provided (with a debounce)', async () => {
    buffer$.next({ ...baseStatus });
    buffer$.next({ ...baseStatus });
    buffer$.next({ ...baseStatus });

    // not logged yet since the debounce time hasn't passed
    expect(loggedMessages).toMatchInlineSnapshot(`Array []`);

    await jest.advanceTimersByTimeAsync(bufferTimeMillis / 2); // Half the buffer time
    expect(loggedMessages).toMatchInlineSnapshot(`Array []`);

    await jest.advanceTimersByTimeAsync(bufferTimeMillis);
    expect(loggedMessages).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "available",
          "name": "test-service",
          "repeats": 3,
          "summary": "this is a test",
        },
      ]
    `);
  });

  test('no need to wait for 3 messages', async () => {
    buffer$.next({ ...baseStatus });
    buffer$.next({ ...baseStatus });

    // not logged yet since the debounce time hasn't passed
    expect(loggedMessages).toMatchInlineSnapshot(`Array []`);

    await jest.advanceTimersByTimeAsync(bufferTimeMillis / 2); // Half the buffer time
    expect(loggedMessages).toMatchInlineSnapshot(`Array []`);

    await jest.advanceTimersByTimeAsync(bufferTimeMillis);
    expect(loggedMessages).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "available",
          "name": "test-service",
          "repeats": 2,
          "summary": "this is a test",
        },
      ]
    `);
  });

  test('buffers all the messages received during the interval time', async () => {
    buffer$.next({ ...baseStatus });
    buffer$.next({ ...baseStatus });
    buffer$.next({ ...baseStatus });

    // not logged yet since the debounce time hasn't passed
    expect(loggedMessages).toMatchInlineSnapshot(`Array []`);

    await jest.advanceTimersByTimeAsync(bufferTimeMillis / 2); // Half the buffer time
    buffer$.next({ ...baseStatus });
    buffer$.next({ ...baseStatus });
    buffer$.next({ ...baseStatus });
    expect(loggedMessages).toMatchInlineSnapshot(`Array []`);

    buffer$.next({ ...baseStatus });
    buffer$.next({ ...baseStatus });
    buffer$.next({ ...baseStatus });

    await jest.advanceTimersByTimeAsync(bufferTimeMillis);
    expect(loggedMessages).toMatchInlineSnapshot(`
      Array [
        Object {
          "level": "available",
          "name": "test-service",
          "repeats": 9,
          "summary": "this is a test",
        },
      ]
    `);
  });
});
