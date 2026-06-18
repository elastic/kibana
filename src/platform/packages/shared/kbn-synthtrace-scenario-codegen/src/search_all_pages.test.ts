/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { searchAllPages } from './search_all_pages';
import type { PageSearchFn } from './search_all_pages';

const makeHits = (start: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({ _source: { n: start + i }, sort: [start + i] }));

describe('searchAllPages', () => {
  it('pages with search_after until a short page is returned', async () => {
    const calls: Array<unknown[] | undefined> = [];
    const search: PageSearchFn = async ({ size, search_after }) => {
      calls.push(search_after);
      // First page full (size), second page short -> done.
      const offset = (search_after?.[0] as number | undefined) ?? -1;
      const count = offset < 0 ? size : 2;
      return { hits: { hits: makeHits(offset + 1, Math.min(count, size)) } };
    };

    const { docs, truncated } = await searchAllPages<{ n: number }>({
      search,
      query: { match_all: {} },
      max: 100,
      pageSize: 5,
    });

    expect(truncated).toBe(false);
    expect(docs).toHaveLength(7);
    expect(calls[0]).toBeUndefined();
    expect(calls[1]).toEqual([4]);
  });

  it('reports truncated when it reaches max with more available', async () => {
    const search: PageSearchFn = async ({ size, search_after }) => {
      const offset = (search_after?.[0] as number | undefined) ?? -1;
      return { hits: { hits: makeHits(offset + 1, size) } };
    };

    const { docs, truncated } = await searchAllPages<{ n: number }>({
      search,
      query: { match_all: {} },
      max: 6,
      pageSize: 3,
    });

    expect(truncated).toBe(true);
    expect(docs).toHaveLength(6);
  });

  it('skips hits without a _source', async () => {
    const search: PageSearchFn = async () => ({
      hits: { hits: [{ _source: { n: 1 }, sort: [1] }, { sort: [2] }] },
    });

    const { docs } = await searchAllPages<{ n: number }>({
      search,
      query: {},
      max: 10,
      pageSize: 10,
    });

    expect(docs).toEqual([{ n: 1 }]);
  });
});
