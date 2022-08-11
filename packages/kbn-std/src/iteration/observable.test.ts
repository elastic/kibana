/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { toArray } from 'rxjs/operators';

import { map$, mapWithLimit$ } from './observable';
import { list, sleep, generator } from './test_helpers';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('mapWithLimit$', () => {
  it('calls the fn for each item and produced each item on the stream with limit 1', async () => {
    let maxConcurrency = 0;
    let active = 0;
    const limit = Math.random() > 0.5 ? 20 : 40;

    const results = await Rx.lastValueFrom(
      mapWithLimit$(list(100), limit, async (n) => {
        active += 1;
        if (active > maxConcurrency) {
          maxConcurrency = active;
        }
        await sleep(5);
        active -= 1;
        return n;
      }).pipe(toArray())
    );

    expect(maxConcurrency).toBe(limit);
    expect(results).toHaveLength(100);
    for (const [n, i] of results.entries()) {
      expect(n).toBe(i);
    }
  });

  it.each([
    ['empty array', [], []] as const,
    ['empty generator', generator(0), []] as const,
    ['generator', generator(5), [0, 1, 2, 3, 4]] as const,
    ['set', new Set([5, 4, 3, 2, 1]), [5, 4, 3, 2, 1]] as const,
    ['observable', Rx.of(1, 2, 3, 4, 5), [1, 2, 3, 4, 5]] as const,
  ])('works with %p', async (_, iter, expected) => {
    const mock = jest.fn(async (n) => n);
    const results = await Rx.lastValueFrom(mapWithLimit$(iter, 1, mock).pipe(toArray()));
    expect(results).toEqual(expected);
  });
});

describe('map$', () => {
  it('applies no limit to mapWithLimit$', async () => {
    let maxConcurrency = 0;
    let active = 0;

    const results = await Rx.lastValueFrom(
      map$(list(100), async (n) => {
        active += 1;
        if (active > maxConcurrency) {
          maxConcurrency = active;
        }
        await sleep(5);
        active -= 1;
        return n;
      }).pipe(toArray())
    );

    expect(maxConcurrency).toBe(100);
    expect(results).toHaveLength(100);
    for (const [n, i] of results.entries()) {
      expect(n).toBe(i);
    }
  });
});
