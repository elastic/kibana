/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeChildrenStateLoading } from './children_state_loading';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe('initializeChildrenStateLoading', () => {
  it('is true synchronously while work runs and false after', async () => {
    const { setChildrenStateLoadingWhile, childrenStateLoading$ } =
      initializeChildrenStateLoading();
    const work = deferred();

    const tracked = setChildrenStateLoadingWhile(() => work.promise);
    expect(childrenStateLoading$.value).toBe(true);

    work.resolve();
    await tracked;
    expect(childrenStateLoading$.value).toBe(false);
  });

  it('stays true until every overlapping operation has finished', async () => {
    const { setChildrenStateLoadingWhile, childrenStateLoading$ } =
      initializeChildrenStateLoading();
    const values: boolean[] = [];
    childrenStateLoading$.subscribe((value) => values.push(value));
    const first = deferred();
    const second = deferred();

    const firstDone = setChildrenStateLoadingWhile(() => first.promise);
    const secondDone = setChildrenStateLoadingWhile(() => second.promise);
    first.resolve();
    await firstDone;
    expect(values).toEqual([false, true]);

    second.resolve();
    await secondDone;
    expect(values).toEqual([false, true, false]);
  });

  it('returns the result of the work', async () => {
    const { setChildrenStateLoadingWhile } = initializeChildrenStateLoading();
    await expect(setChildrenStateLoadingWhile(async () => 'result')).resolves.toBe('result');
  });

  it('clears loading and rethrows when the work fails', async () => {
    const { setChildrenStateLoadingWhile, childrenStateLoading$ } =
      initializeChildrenStateLoading();
    await expect(
      setChildrenStateLoadingWhile(() => {
        throw new Error('failed');
      })
    ).rejects.toThrow('failed');
    expect(childrenStateLoading$.value).toBe(false);
  });
});
