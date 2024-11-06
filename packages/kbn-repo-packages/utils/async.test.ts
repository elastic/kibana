/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout } from 'timers/promises';
import { asyncMapWithLimit } from './async';

const NUMS = [1, 2, 3, 4];
const ident = jest.fn(async function ident<T>(x: T) {
  return await x;
});
const double = jest.fn(async function double(x: number) {
  return x * 2;
});

beforeEach(() => {
  jest.clearAllMocks();
});

it('resolves with an empty array', async () => {
  const result = await asyncMapWithLimit([], 10, ident);
  expect(ident).not.toHaveBeenCalled();
  expect(result).toEqual([]);
});

it('resolves with a mapped array', async () => {
  const result = await asyncMapWithLimit(NUMS, 10, double);
  expect(double).toHaveBeenCalledTimes(NUMS.length);
  expect(result.join(',')).toMatchInlineSnapshot(`"2,4,6,8"`);
});

it('rejects when limit it not >= 1', async () => {
  await expect(() => asyncMapWithLimit([], -1, ident)).rejects.toMatchInlineSnapshot(
    `[Error: invalid limit, must be greater than 0]`
  );
  await expect(() => asyncMapWithLimit([], 0, ident)).rejects.toMatchInlineSnapshot(
    `[Error: invalid limit, must be greater than 0]`
  );
  await expect(() => asyncMapWithLimit([], -Infinity, ident)).rejects.toMatchInlineSnapshot(
    `[Error: invalid limit, must be greater than 0]`
  );
});

it('rejects with the first error produced and stops calling mapFn', async () => {
  const map = jest.fn(async (num) => {
    if (num % 2 === 0) {
      throw new Error('even numbers are not supported');
    }
    return num * 2;
  });

  await expect(() => asyncMapWithLimit(NUMS, 1, map)).rejects.toMatchInlineSnapshot(
    `[Error: even numbers are not supported]`
  );
  await setTimeout(10);
  expect(map).toHaveBeenCalledTimes(2);
});
