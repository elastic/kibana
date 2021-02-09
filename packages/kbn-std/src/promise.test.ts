/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { withTimeout, isPromise } from './promise';

const delay = (ms: number, resolveValue?: any) =>
  new Promise((resolve) => setTimeout(resolve, ms, resolveValue));

describe('withTimeout', () => {
  it('resolves with a promise value if resolved in given timeout', async () => {
    await expect(
      withTimeout({
        promise: delay(10, 'value'),
        timeout: 200,
        errorMessage: 'error-message',
      })
    ).resolves.toBe('value');
  });

  it('rejects with errorMessage if not resolved in given time', async () => {
    await expect(
      withTimeout({
        promise: delay(200, 'value'),
        timeout: 10,
        errorMessage: 'error-message',
      })
    ).rejects.toMatchInlineSnapshot(`[Error: error-message]`);

    await expect(
      withTimeout({
        promise: new Promise((i) => i),
        timeout: 10,
        errorMessage: 'error-message',
      })
    ).rejects.toMatchInlineSnapshot(`[Error: error-message]`);
  });

  it('does not swallow promise error', async () => {
    await expect(
      withTimeout({
        promise: Promise.reject(new Error('from-promise')),
        timeout: 10,
        errorMessage: 'error-message',
      })
    ).rejects.toMatchInlineSnapshot(`[Error: from-promise]`);
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
