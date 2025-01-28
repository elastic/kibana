/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';

import { asyncForEach, asyncForEachWithLimit } from './for_each';
import { list, sleep } from './test_helpers';

jest.mock('./observable');
const mockMapWithLimit$: jest.Mock = jest.requireMock('./observable').mapWithLimit$;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('asyncForEachWithLimit', () => {
  it('calls mapWithLimit$ and resolves with undefined when it completes', async () => {
    const iter = list(10);
    const limit = 5;
    const fn = jest.fn();

    const result$ = new Rx.Subject();
    mockMapWithLimit$.mockImplementation(() => result$);
    const promise = asyncForEachWithLimit(iter, limit, fn);

    let resolved = false;
    promise.then(() => (resolved = true));

    expect(mockMapWithLimit$).toHaveBeenCalledTimes(1);
    expect(mockMapWithLimit$).toHaveBeenCalledWith(iter, limit, fn);

    expect(resolved).toBe(false);
    result$.next(1);
    result$.next(2);
    result$.next(3);

    await sleep(10);
    expect(resolved).toBe(false);

    result$.complete();
    await expect(promise).resolves.toBe(undefined);
  });

  it('resolves when iterator is empty', async () => {
    mockMapWithLimit$.mockImplementation((x) => Rx.from(x));
    await expect(asyncForEachWithLimit([], 100, async () => 'foo')).resolves.toBe(undefined);
  });
});

describe('asyncForEach', () => {
  it('calls mapWithLimit$ without limit and resolves with undefined when it completes', async () => {
    const iter = list(10);
    const fn = jest.fn();

    const result$ = new Rx.Subject();
    mockMapWithLimit$.mockImplementation(() => result$);
    const promise = asyncForEach(iter, fn);

    let resolved = false;
    promise.then(() => (resolved = true));

    expect(mockMapWithLimit$).toHaveBeenCalledTimes(1);
    expect(mockMapWithLimit$).toHaveBeenCalledWith(iter, Infinity, fn);

    expect(resolved).toBe(false);
    result$.next(1);
    result$.next(2);
    result$.next(3);

    await sleep(10);
    expect(resolved).toBe(false);

    result$.complete();
    await expect(promise).resolves.toBe(undefined);
  });
});
