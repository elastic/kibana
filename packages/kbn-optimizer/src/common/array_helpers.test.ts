/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
    expect(
      Array.from(values)
        .sort(ascending(a, b, c))
        .map(print)
    ).toMatchInlineSnapshot(`
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

    expect(
      Array.from(values)
        .sort(descending(a, b, c))
        .map(print)
    ).toMatchInlineSnapshot(`
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
