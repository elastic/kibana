/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeApplyChildStateQueue } from './apply_child_state_queue';
import { initializeChildrenStateLoading } from './children_state_loading';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const setup = () => {
  const loading = initializeChildrenStateLoading();
  return { ...loading, ...initializeApplyChildStateQueue(loading.setChildrenStateLoadingWhile) };
};

describe('initializeApplyChildStateQueue', () => {
  it('runs jobs one at a time in enqueue order', async () => {
    const { enqueue } = setup();
    const events: string[] = [];
    const first = deferred();

    const firstDone = enqueue(async () => {
      events.push('first start');
      await first.promise;
      events.push('first end');
    });
    const secondDone = enqueue(() => {
      events.push('second start');
    });

    await Promise.resolve();
    expect(events).toEqual(['first start']);

    first.resolve();
    await Promise.all([firstDone, secondDone]);
    expect(events).toEqual(['first start', 'first end', 'second start']);
  });

  it('resolves with the job result', async () => {
    const { enqueue } = setup();
    await expect(enqueue(async () => 'result')).resolves.toBe('result');
  });

  it('flags loading until every queued job has finished', async () => {
    const { enqueue, childrenStateLoading$ } = setup();
    const values: boolean[] = [];
    childrenStateLoading$.subscribe((value) => values.push(value));
    const first = deferred();
    const second = deferred();

    const firstDone = enqueue(() => first.promise);
    const secondDone = enqueue(() => second.promise);
    expect(values).toEqual([false, true]);

    first.resolve();
    await firstDone;
    expect(values).toEqual([false, true]);

    second.resolve();
    await secondDone;
    expect(values).toEqual([false, true, false]);
  });

  it('rejects the failing job, continues with later jobs, and clears loading', async () => {
    const { enqueue, childrenStateLoading$ } = setup();
    const later = jest.fn();

    const failed = enqueue(() => {
      throw new Error('apply failed');
    });
    const laterDone = enqueue(later);

    await expect(failed).rejects.toThrow('apply failed');
    await laterDone;
    expect(later).toHaveBeenCalledTimes(1);
    expect(childrenStateLoading$.value).toBe(false);
  });
});
