/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '..';
import type { ESQLAstExpression, ESQLFunction } from '../../types';

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
    const expression = root.commands[0].args[0] as ESQLAstExpression;

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

    const textNot = text.slice(expression.location.min, expression.location.max + 1);

    expect(textNot).toBe('NOT col');
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

  it('IS NULL', () => {
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

  it('IS NOT NULL', () => {
    const text = 'ROW col IS NOT NULL';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0] as ESQLFunction;

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      subtype: 'postfix-unary-expression',
      name: 'is not null',
    });

    const textIs = text.slice(expression.location.min, expression.location.max + 1);

    expect(textIs).toBe('col IS NOT NULL');
  });

  it('logical OR', () => {
    const text = 'ROW col1 OR col2';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      subtype: 'binary-expression',
      name: 'or',
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

  it('combined AND and OR with precedence', () => {
    const text = 'ROW col1 AND col2 OR col3';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      name: 'or',
      args: [
        {
          type: 'function',
          name: 'and',
        },
        {
          type: 'column',
          name: 'col3',
        },
      ],
    });
  });

  it('comparison: equals', () => {
    const text = 'ROW col == 5';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      subtype: 'binary-expression',
      name: '==',
      args: [
        {
          type: 'column',
          name: 'col',
        },
        {
          type: 'literal',
          value: 5,
        },
      ],
    });
  });

  it('comparison: not equals', () => {
    const text = 'ROW col != 5';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      subtype: 'binary-expression',
      name: '!=',
      args: [
        {
          type: 'column',
          name: 'col',
        },
        {
          type: 'literal',
          value: 5,
        },
      ],
    });
  });

  it('comparison: less than', () => {
    const text = 'ROW col < 10';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      subtype: 'binary-expression',
      name: '<',
      args: [
        {
          type: 'column',
          name: 'col',
        },
        {
          type: 'literal',
          value: 10,
        },
      ],
    });
  });

  it('IN operator with list', () => {
    const text = 'ROW col IN (1, 2, 3)';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      subtype: 'binary-expression',
      name: 'in',
      args: [
        {
          type: 'column',
          name: 'col',
        },
        {
          type: 'list',
        },
      ],
    });
  });

  it('NOT IN operator', () => {
    const text = 'ROW col NOT IN (1, 2, 3)';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      subtype: 'binary-expression',
      name: 'not in',
    });
  });

  it('LIKE operator', () => {
    const text = 'ROW name LIKE "test*"';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      name: 'like',
      args: [
        {
          type: 'column',
          name: 'name',
        },
        {
          type: 'literal',
          literalType: 'keyword',
        },
      ],
    });
  });

  it('complex nested boolean expression', () => {
    const text = 'ROW (col1 > 5 AND col2 < 10) OR (col3 == "value" AND NOT col4)';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      name: 'or',
      args: [
        {
          type: 'function',
          name: 'and',
          args: [
            {
              type: 'function',
              name: '>',
            },
            {
              type: 'function',
              name: '<',
            },
          ],
        },
        {
          type: 'function',
          name: 'and',
          args: [
            {
              type: 'function',
              name: '==',
            },
            {
              type: 'function',
              name: 'not',
            },
          ],
        },
      ],
    });
  });

  it('chained comparisons with AND', () => {
    const text = 'ROW col1 > 5 AND col1 < 10';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      name: 'and',
      args: [
        {
          type: 'function',
          name: '>',
        },
        {
          type: 'function',
          name: '<',
        },
      ],
    });
  });

  it('multiple NOT operations', () => {
    const text = 'ROW NOT NOT col';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      name: 'not',
      args: [
        {
          type: 'function',
          name: 'not',
          args: [
            {
              type: 'column',
              name: 'col',
            },
          ],
        },
      ],
    });
  });

  it('boolean with arithmetic expression', () => {
    const text = 'ROW col1 + col2 > 10';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      name: '>',
      args: [
        {
          type: 'function',
          name: '+',
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
        },
        {
          type: 'literal',
          value: 10,
        },
      ],
    });
  });

  it('boolean with function call', () => {
    const text = 'ROW LENGTH(name) > 5';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      name: '>',
      args: [
        {
          type: 'function',
          name: 'length',
        },
        {
          type: 'literal',
          value: 5,
        },
      ],
    });
  });
});
