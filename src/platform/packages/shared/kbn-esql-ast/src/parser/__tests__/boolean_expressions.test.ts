/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '..';

describe('Column Identifier Expressions', () => {
  it('a literal/constant', () => {
    const text = 'ROW 123';
    const { root } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(expression).toMatchObject({
      type: 'literal',
      value: 123,
    });
  });

  it('parenthesized', () => {
    const text = 'ROW (123)';
    const { root } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(expression).toMatchObject({
      type: 'literal',
      value: 123,
    });
  });

  it('addition', () => {
    const text = 'ROW 1 + 2';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      subtype: 'binary-expression',
      name: '+',
      args: [
        {
          type: 'literal',
          value: 1,
        },
        {
          type: 'literal',
          value: 2,
        },
      ],
    });
  });

  it('logical AND', () => {
    const text = 'ROW col1 AND col2';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      subtype: 'binary-expression',
      name: 'and',
      args: [
        {
          type: 'column',
          name: 'col1',
        },
        {
          type: 'column',
          name: 'col2',
        },
      ],
    });
  });

  it('logical NOT', () => {
    const text = 'ROW NOT col';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      subtype: 'unary-expression',
      name: 'not',
      args: [
        {
          type: 'column',
          name: 'col',
        },
      ],
    });
  });

  it('logical NOT with nested expression', () => {
    const text = 'ROW NOT (col1 AND col2)';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      subtype: 'unary-expression',
      name: 'not',
      args: [
        {
          type: 'function',
          name: 'and',
        },
      ],
    });
  });

  it('NULL', () => {
    const text = 'ROW NULL';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'literal',
      literalType: 'null',
    });
  });

  it('IS NOT NULL', () => {
    const text = 'ROW col IS NULL';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      subtype: 'postfix-unary-expression',
      name: 'is null',
    });
  });
});
