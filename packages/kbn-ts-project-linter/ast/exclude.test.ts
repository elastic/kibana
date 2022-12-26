/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';

import { setExclude } from './exclude';

describe('setExclude()', () => {
  it('overwrites previous formatting', () => {
    expect(
      setExclude(
        dedent`
          {
            "exclude": [1, 2,
              "foo"
            ]
          }
        `,
        ['1', 'bar']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"exclude\\": [
          \\"1\\",
          \\"bar\\",
        ]
      }"
    `);
  });

  it('adds the property at the end if it does not exist', () => {
    expect(
      setExclude(
        dedent`
          {
            "foo": 1
          }
        `,
        ['1', 'bar']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"foo\\": 1,
        \\"exclude\\": [
          \\"1\\",
          \\"bar\\",
        ]
      }"
    `);
    expect(
      setExclude(
        dedent`
          {
            "foo": 1,
          }
        `,
        ['1', 'bar']
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"foo\\": 1,
        \\"exclude\\": [
          \\"1\\",
          \\"bar\\",
        ],
      }"
    `);
  });
});
