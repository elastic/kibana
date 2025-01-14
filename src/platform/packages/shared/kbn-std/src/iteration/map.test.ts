/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { mapTo } from 'rxjs';

import { asyncMap, asyncMapWithLimit } from './map';
import { list } from './test_helpers';

jest.mock('./observable');
const mapWithLimit$: jest.Mock = jest.requireMock('./observable').mapWithLimit$;
mapWithLimit$.mockImplementation(jest.requireActual('./observable').mapWithLimit$);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('asyncMapWithLimit', () => {
  it('calls mapWithLimit$ and resolves with properly sorted results', async () => {
    const iter = list(10);
    const limit = 5;
    const fn = jest.fn((n) => (n % 2 ? Rx.timer(n) : Rx.timer(n * 4)).pipe(mapTo(n)));
    const result = await asyncMapWithLimit(iter, limit, fn);

    expect(result).toMatchInlineSnapshot(`
      Array [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
      ]
    `);

    expect(mapWithLimit$).toHaveBeenCalledTimes(1);
    expect(mapWithLimit$).toHaveBeenCalledWith(iter, limit, expect.any(Function));
  });

  it.each([
    [list(0), []] as const,
    [list(1), ['foo']] as const,
    [list(2), ['foo', 'foo']] as const,
  ])('resolves when iterator is %p', async (input, output) => {
    await expect(asyncMapWithLimit(input, 100, async () => 'foo')).resolves.toEqual(output);
  });
});

describe('asyncMap', () => {
  it('calls mapWithLimit$ without limit and resolves with undefined when it completes', async () => {
    const iter = list(10);
    const fn = jest.fn((n) => (n % 2 ? Rx.timer(n) : Rx.timer(n * 4)).pipe(mapTo(n)));
    const result = await asyncMap(iter, fn);

    expect(result).toMatchInlineSnapshot(`
      Array [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
      ]
    `);

    expect(mapWithLimit$).toHaveBeenCalledTimes(1);
    expect(mapWithLimit$).toHaveBeenCalledWith(iter, Infinity, expect.any(Function));
  });
});
