/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';

import { setExtends } from './extends';

describe('setExtends()', () => {
  it('overrides the value of the extends key', () => {
    expect(
      setExtends(
        dedent`
          {
            "foo": "bar",
            "extends": "foo",
            "x": 1
          }
        `,
        'new value'
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"foo\\": \\"bar\\",
        \\"extends\\": \\"new value\\",
        \\"x\\": 1
      }"
    `);
  });

  it('adds missing values at the top of the object', () => {
    expect(
      setExtends(
        dedent`
          {
            "foo": "bar",
            "x": 1
          }
        `,
        'new value'
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"extends\\": \\"new value\\",
        \\"foo\\": \\"bar\\",
        \\"x\\": 1
      }"
    `);
  });

  it('supports setting on an empty object', () => {
    expect(
      setExtends(
        dedent`
          {}
        `,
        'new value'
      )
    ).toMatchInlineSnapshot(`
      "{
        \\"extends\\": \\"new value\\"
      }"
    `);
  });
});
