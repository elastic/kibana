/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { prettyPrintAndSortKeys } from '.';

describe('prettyPrintAndSortKeys', () => {
  it('pretty prints JSON and consistently sorts the keys', () => {
    const object1 = {
      zap: { z: 1, b: 2 },
      foo: 'foo',
      bar: 'bar',
    };
    const object2 = {
      foo: 'foo',
      zap: { z: 1, b: 2 },
      bar: 'bar',
    };
    expect(prettyPrintAndSortKeys(object1)).toMatchInlineSnapshot(`
      "{
        \\"bar\\": \\"bar\\",
        \\"foo\\": \\"foo\\",
        \\"zap\\": {
          \\"b\\": 2,
          \\"z\\": 1
        }
      }"
    `);

    expect(prettyPrintAndSortKeys(object1)).toEqual(prettyPrintAndSortKeys(object2));
  });

  it('pretty prints and sorts nested objects with arrays', () => {
    const object = {
      zap: {
        a: {
          b: 1,
          a: 2,
        },
      },
      foo: 'foo',
      bar: 'bar',
      baz: [
        {
          c: 2,
          b: 1,
        },
        {
          c: {
            b: 1,
            a: 2,
          },
        },
      ],
    };
    expect(prettyPrintAndSortKeys(object)).toMatchInlineSnapshot(`
      "{
        \\"bar\\": \\"bar\\",
        \\"baz\\": [
          {
            \\"b\\": 1,
            \\"c\\": 2
          },
          {
            \\"c\\": {
              \\"a\\": 2,
              \\"b\\": 1
            }
          }
        ],
        \\"foo\\": \\"foo\\",
        \\"zap\\": {
          \\"a\\": {
            \\"a\\": 2,
            \\"b\\": 1
          }
        }
      }"
    `);
  });
});
