/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeApplyingChildState } from './applying_child_state';

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('initializeApplyingChildState', () => {
  test('is false initially', () => {
    const { applyingChildState$ } = initializeApplyingChildState();
    expect(applyingChildState$.value).toBe(false);
  });

  test('is true synchronously on call and false after work settles', async () => {
    const { applyingChildState$, setApplyingChildStateWhile } = initializeApplyingChildState();
    const work = deferred();

    const result = setApplyingChildStateWhile(() => work.promise);
    expect(applyingChildState$.value).toBe(true);

    work.resolve();
    await result;
    expect(applyingChildState$.value).toBe(false);
  });

  test('resolves with the result of work', async () => {
    const { setApplyingChildStateWhile } = initializeApplyingChildState();
    await expect(setApplyingChildStateWhile(() => 'result')).resolves.toBe('result');
  });

  test('stays true until the last overlapping call settles', async () => {
    const { applyingChildState$, setApplyingChildStateWhile } = initializeApplyingChildState();
    const first = deferred();
    const second = deferred();

    const firstResult = setApplyingChildStateWhile(() => first.promise);
    const secondResult = setApplyingChildStateWhile(() => second.promise);

    first.resolve();
    await firstResult;
    expect(applyingChildState$.value).toBe(true);

    second.resolve();
    await secondResult;
    expect(applyingChildState$.value).toBe(false);
  });

  test('rejects and resets when work rejects', async () => {
    const { applyingChildState$, setApplyingChildStateWhile } = initializeApplyingChildState();

    await expect(
      setApplyingChildStateWhile(async () => {
        throw new Error('async failure');
      })
    ).rejects.toThrow('async failure');
    expect(applyingChildState$.value).toBe(false);
  });

  test('rejects and resets when work throws synchronously', async () => {
    const { applyingChildState$, setApplyingChildStateWhile } = initializeApplyingChildState();

    await expect(
      setApplyingChildStateWhile(() => {
        throw new Error('sync failure');
      })
    ).rejects.toThrow('sync failure');
    expect(applyingChildState$.value).toBe(false);
  });
});
