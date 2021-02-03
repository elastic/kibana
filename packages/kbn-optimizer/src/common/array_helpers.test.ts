/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ascending, descending } from './array_helpers';

describe('ascending/descending', () => {
  interface Item {
    a: number;
    b: number | string;
    c?: number;
  }

  const a = (x: Item) => x.a;
  const b = (x: Item) => x.b;
  const c = (x: Item) => x.c;
  const print = (x: Item) => `${x.a}/${x.b}/${x.c}`;
  const values: Item[] = [
    { a: 1, b: 2, c: 3 },
    { a: 3, b: 2, c: 1 },
    { a: 9, b: 9, c: 9 },
    { a: 8, b: 5, c: 8 },
    { a: 8, b: 5 },
    { a: 8, b: 4 },
    { a: 8, b: 3, c: 8 },
    { a: 8, b: 2 },
    { a: 8, b: 1, c: 8 },
    { a: 8, b: 1 },
    { a: 8, b: 0 },
    { a: 8, b: -1, c: 8 },
    { a: 8, b: -2 },
    { a: 8, b: -3, c: 8 },
    { a: 8, b: -4 },
    { a: 8, b: 'foo', c: 8 },
    { a: 8, b: 'foo' },
    { a: 8, b: 'bar', c: 8 },
    { a: 8, b: 'bar' },
  ].sort(() => 0.5 - Math.random());

  it('sorts items using getters', () => {
    expect(Array.from(values).sort(ascending(a, b, c)).map(print)).toMatchInlineSnapshot(`
      Array [
        "1/2/3",
        "3/2/1",
        "8/-4/undefined",
        "8/-3/8",
        "8/-2/undefined",
        "8/-1/8",
        "8/0/undefined",
        "8/1/undefined",
        "8/1/8",
        "8/2/undefined",
        "8/3/8",
        "8/4/undefined",
        "8/5/undefined",
        "8/5/8",
        "8/bar/undefined",
        "8/bar/8",
        "8/foo/undefined",
        "8/foo/8",
        "9/9/9",
      ]
    `);

    expect(Array.from(values).sort(descending(a, b, c)).map(print)).toMatchInlineSnapshot(`
      Array [
        "9/9/9",
        "8/foo/8",
        "8/foo/undefined",
        "8/bar/8",
        "8/bar/undefined",
        "8/5/8",
        "8/5/undefined",
        "8/4/undefined",
        "8/3/8",
        "8/2/undefined",
        "8/1/8",
        "8/1/undefined",
        "8/0/undefined",
        "8/-1/8",
        "8/-2/undefined",
        "8/-3/8",
        "8/-4/undefined",
        "3/2/1",
        "1/2/3",
      ]
    `);
  });
});
