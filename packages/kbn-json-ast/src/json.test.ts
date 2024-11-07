/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { redent, redentJson, stringify } from './json';

describe('redent()', () => {
  it('indents all but the first line of a string', () => {
    expect(redent('a\nb\nc', '    ')).toMatchInlineSnapshot(`
      "a
          b
          c"
    `);
  });
});

describe('redentJson()', () => {
  it('indents all but the first line of the JSON representation of a value', () => {
    expect(redentJson({ a: 1, b: 2, foo: [1, 2, 3] }, '    ')).toMatchInlineSnapshot(`
      "{
            \\"a\\": 1,
            \\"b\\": 2,
            \\"foo\\": [
              1,
              2,
              3
            ]
          }"
    `);
  });
});

describe('stringify()', () => {
  it('stringifies value into pretty JSON', () => {
    expect(stringify({ a: 1, b: 2, foo: [1, 2, 3] })).toMatchInlineSnapshot(`
      "{
        \\"a\\": 1,
        \\"b\\": 2,
        \\"foo\\": [
          1,
          2,
          3
        ]
      }"
    `);
  });
});
