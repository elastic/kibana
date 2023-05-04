/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { diffStrings } from './diff_strings';

const json = (x: any) => JSON.stringify(x, null, 2);

describe('diffStrings()', () => {
  it('returns undefined if values are equal', () => {
    expect(diffStrings('1', '1')).toBe(undefined);
    expect(diffStrings(json(['1', '2', { a: 'b' }]), json(['1', '2', { a: 'b' }]))).toBe(undefined);
    expect(
      diffStrings(
        json({
          a: '1',
          b: '2',
        }),
        json({
          a: '1',
          b: '2',
        })
      )
    ).toBe(undefined);
  });

  it('returns a diff if the values are different', () => {
    const diff = diffStrings(json(['1', '2', { a: 'b' }]), json(['1', '2', { b: 'a' }]));

    expect(diff).toMatchInlineSnapshot(`
      "[32m- Expected[39m
      [31m+ Received[39m

      [2m  [[22m
      [2m    \\"1\\",[22m
      [2m    \\"2\\",[22m
      [2m    {[22m
      [32m-     \\"a\\": \\"b\\"[39m
      [31m+     \\"b\\": \\"a\\"[39m
      [2m    }[22m
      [2m  ][22m"
    `);

    const diff2 = diffStrings(
      json({
        a: '1',
        b: '1',
      }),
      json({
        b: '2',
        a: '2',
      })
    );

    expect(diff2).toMatchInlineSnapshot(`
      "[32m- Expected[39m
      [31m+ Received[39m

      [2m  {[22m
      [32m-   \\"a\\": \\"1\\",[39m
      [32m-   \\"b\\": \\"1\\"[39m
      [31m+   \\"b\\": \\"2\\",[39m
      [31m+   \\"a\\": \\"2\\"[39m
      [2m  }[22m"
    `);
  });

  it('formats large diffs to focus on the changed lines', () => {
    const diff = diffStrings(
      json({
        a: ['1', '1', '1', '1', '1', '1', '1', '2', '1', '1', '1', '1', '1', '1', '1', '1', '1'],
      }),
      json({
        b: ['1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '2', '1', '1', '1', '1'],
      })
    );

    expect(diff).toMatchInlineSnapshot(`
      "[32m- Expected[39m
      [31m+ Received[39m

      [2m  {[22m
      [32m-   \\"a\\": [[39m
      [31m+   \\"b\\": [[39m
      [2m      \\"1\\",[22m
      [2m      \\"1\\",[22m
      [2m      ...[22m
      [2m      \\"1\\",[22m
      [2m      \\"1\\",[22m
      [32m-     \\"2\\",[39m
      [2m      \\"1\\",[22m
      [2m      \\"1\\",[22m
      [2m      ...[22m
      [2m      \\"1\\",[22m
      [2m      \\"1\\",[22m
      [31m+     \\"2\\",[39m
      [2m      \\"1\\",[22m
      [2m      \\"1\\",[22m
      [2m      ...[22m"
    `);
  });
});
