/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';
import { snip } from './snip';

describe('snip()', () => {
  it('removes ranges from a string', () => {
    expect(snip('abcd', [[0, 1]])).toBe('bcd');
    expect(
      snip('abcd', [
        [0, 1],
        [2, 3],
      ])
    ).toBe('bd');
  });

  it('handles weirdly ordered and overlapping ranges', () => {
    expect(
      snip(
        dedent`
          This is the sentence and I would like to remove specific words to make it say something else.
        `,
        [
          [29, 59],
          [30, 41],
          [78, 80],
          [12, 25],
          [87, 92],
        ]
      )
    ).toMatchInlineSnapshot(`"This is the I words to make it say mething."`);
  });

  it('throws if the snips are misordered', () => {
    expect(() => snip('foo', [[2, 1]])).toThrowErrorMatchingInlineSnapshot(
      `"snips can not be reversed, received [2,1]"`
    );
  });

  it("supports snips with replacements, as long as they don't overlap", () => {
    expect(
      snip('foo bar', [
        [2, 3, 'Oo0'],
        [4, 5, 'BbB'],
      ])
    ).toMatchInlineSnapshot(`"foOo0 BbBar"`);
  });
});
