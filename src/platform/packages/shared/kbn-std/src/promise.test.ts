/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout as nodeSetTimeout } from 'timers';
import { withTimeout, isPromise } from './promise';

const delay = (ms: number, resolveValue?: any) =>
  new Promise((resolve) => setTimeout(resolve, ms, resolveValue));

describe('withTimeout', () => {
  it('resolves with a promise value and "timedout: false" if resolved in given timeout', async () => {
    await expect(
      withTimeout({
        promise: delay(10, 'value'),
        timeoutMs: 200,
      })
    ).resolves.toStrictEqual({ value: 'value', timedout: false });
  });

  it('resolves with "timedout: false" if not resolved in given time', async () => {
    await expect(
      withTimeout({
        promise: delay(200, 'value'),
        timeoutMs: 10,
      })
    ).resolves.toStrictEqual({ timedout: true });

    await expect(
      withTimeout({
        promise: new Promise((i) => i),
        timeoutMs: 10,
      })
    ).resolves.toStrictEqual({ timedout: true });
  });

  it('does not swallow promise error', async () => {
    await expect(
      withTimeout({
        promise: Promise.reject(new Error('from-promise')),
        timeoutMs: 10,
      })
    ).rejects.toMatchInlineSnapshot(`[Error: from-promise]`);
  });

  it('drops the event-loop ref only when unref is true, and still reports the timeout', async () => {
    const timers: NodeJS.Timeout[] = [];
    const spy = jest.spyOn(global, 'setTimeout').mockImplementation(((
      handler: () => void,
      timeout?: number
    ) => {
      // Call the Node timer directly. Spreading unknown extra args makes this resolve
      // to the DOM setTimeout overload, which is typed as returning a number.
      const timer = nodeSetTimeout(handler, timeout);
      timers.push(timer);
      return timer;
    }) as typeof setTimeout);

    try {
      const unrefed = withTimeout({
        promise: new Promise(() => {}),
        timeoutMs: 20,
        unref: true,
      });
      expect(timers).toHaveLength(1);
      expect(timers[0].hasRef()).toBe(false);
      await expect(unrefed).resolves.toStrictEqual({ timedout: true });

      const referenced = withTimeout({
        promise: new Promise(() => {}),
        timeoutMs: 20,
      });
      expect(timers).toHaveLength(2);
      expect(timers[1].hasRef()).toBe(true);
      await expect(referenced).resolves.toStrictEqual({ timedout: true });
    } finally {
      spy.mockRestore();
    }
  });
});

describe('isPromise', () => {
  it('returns true when arg is a Promise', () => {
    expect(isPromise(Promise.resolve('foo'))).toEqual(true);
    expect(isPromise(Promise.reject('foo').catch(() => undefined))).toEqual(true);
  });

  it('returns false when arg is not a Promise', () => {
    expect(isPromise(12)).toEqual(false);
    expect(isPromise('foo')).toEqual(false);
    expect(isPromise({ hello: 'dolly' })).toEqual(false);
    expect(isPromise([1, 2, 3])).toEqual(false);
  });

  it('returns false for objects with a non-function `then` property', () => {
    expect(isPromise({ then: 'bar' })).toEqual(false);
  });

  it('returns false for null and undefined', () => {
    expect(isPromise(null)).toEqual(false);
    expect(isPromise(undefined)).toEqual(false);
  });

  it('returns true for Promise-Like objects', () => {
    expect(isPromise({ then: () => 12 })).toEqual(true);
  });
});
