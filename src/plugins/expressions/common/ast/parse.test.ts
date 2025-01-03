/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from './parse';

describe('parse()', () => {
  test('parses an expression', () => {
    const ast = parse('foo bar="baz"', 'expression');

    expect(ast).toMatchObject({
      type: 'expression',
      chain: [
        {
          type: 'function',
          arguments: {
            bar: ['baz'],
          },
          function: 'foo',
        },
      ],
    });
  });

  test('throws on malformed expression', () => {
    expect(() => {
      parse('{ intentionally malformed }', 'expression');
    }).toThrowError();
  });

  test('parses an argument', () => {
    const arg = parse('foo', 'argument');
    expect(arg).toBe('foo');
  });
});
