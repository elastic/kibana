/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '../..';

describe('regular expressions', () => {
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

  it('NOT LIKE operator', () => {
    const text = 'ROW name NOT LIKE "test*"';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      name: 'not like',
    });
  });

  it('RLIKE operator', () => {
    const text = 'ROW name RLIKE "test.*"';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      name: 'rlike',
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

  it('NOT RLIKE operator', () => {
    const text = 'ROW name NOT RLIKE "test.*"';
    const { root, errors } = Parser.parse(text);
    const expression = root.commands[0].args[0];

    expect(errors.length).toBe(0);
    expect(expression).toMatchObject({
      type: 'function',
      name: 'not rlike',
    });
  });

  describe('location correctness', () => {
    it('LIKE operator - location spans entire expression', () => {
      const text = 'ROW name LIKE "test*"';
      const { root } = Parser.parse(text);
      const expression = root.commands[0].args[0] as any;

      expect(expression.location).toBeDefined();

      const expressionText = text.slice(expression.location.min, expression.location.max + 1);

      expect(expressionText).toBe('name LIKE "test*"');

      const leftText = text.slice(
        expression.args[0].location.min,
        expression.args[0].location.max + 1
      );
      const rightText = text.slice(
        expression.args[1].location.min,
        expression.args[1].location.max + 1
      );
      const operatorText = text.slice(
        expression.operator.location.min,
        expression.operator.location.max + 1
      );

      expect(leftText).toBe('name');
      expect(rightText).toBe('"test*"');
      expect(operatorText).toBe('LIKE');
    });

    it('NOT LIKE operator - location spans entire expression', () => {
      const text = 'ROW name NOT LIKE "test*"';
      const { root } = Parser.parse(text);
      const expression = root.commands[0].args[0] as any;

      expect(expression.location).toBeDefined();

      const expressionText = text.slice(expression.location.min, expression.location.max + 1);

      expect(expressionText).toBe('name NOT LIKE "test*"');
      expect(expression.operator.name).toBe('NOT LIKE');

      const leftText = text.slice(
        expression.args[0].location.min,
        expression.args[0].location.max + 1
      );
      const rightText = text.slice(
        expression.args[1].location.min,
        expression.args[1].location.max + 1
      );
      const operatorText = text.slice(
        expression.operator.location.min,
        expression.operator.location.max + 1
      );

      expect(leftText).toBe('name');
      expect(rightText).toBe('"test*"');
      expect(operatorText).toBe('NOT LIKE');
    });

    it('RLIKE operator - location spans entire expression', () => {
      const text = 'ROW name RLIKE "test.*"';
      const { root } = Parser.parse(text);
      const expression = root.commands[0].args[0] as any;

      expect(expression.location).toBeDefined();
      const sliced = text.slice(expression.location.min, expression.location.max + 1);
      expect(sliced).toBe('name RLIKE "test.*"');
    });

    it('NOT RLIKE operator - location spans entire expression', () => {
      const text = 'ROW name NOT RLIKE "test.*"';
      const { root } = Parser.parse(text);
      const expression = root.commands[0].args[0] as any;

      expect(expression.location).toBeDefined();
      const sliced = text.slice(expression.location.min, expression.location.max + 1);
      expect(sliced).toBe('name NOT RLIKE "test.*"');
    });

    it('LIKE operator - left arg location', () => {
      const text = 'ROW field LIKE "pattern"';
      const { root } = Parser.parse(text);
      const expression = root.commands[0].args[0] as any;
      const leftArg = expression.args[0];

      expect(leftArg.location).toBeDefined();
      const sliced = text.slice(leftArg.location.min, leftArg.location.max + 1);
      expect(sliced).toBe('field');
    });

    it('LIKE operator - right arg location', () => {
      const text = 'ROW field LIKE "pattern"';
      const { root } = Parser.parse(text);
      const expression = root.commands[0].args[0] as any;
      const rightArg = expression.args[1];

      expect(rightArg.location).toBeDefined();
      const sliced = text.slice(rightArg.location.min, rightArg.location.max + 1);
      expect(sliced).toBe('"pattern"');
    });

    it('RLIKE operator - with complex pattern location', () => {
      const text = 'ROW message RLIKE "^[A-Z].*error$"';
      const { root } = Parser.parse(text);
      const expression = root.commands[0].args[0] as any;

      expect(expression.location).toBeDefined();
      const sliced = text.slice(expression.location.min, expression.location.max + 1);
      expect(sliced).toBe('message RLIKE "^[A-Z].*error$"');

      const rightArg = expression.args[1];
      const rightSliced = text.slice(rightArg.location.min, rightArg.location.max + 1);
      expect(rightSliced).toBe('"^[A-Z].*error$"');
    });

    it('LIKE list - entire expression location', () => {
      const text = 'ROW name LIKE ( "test*", "test2*" )';
      const { root } = Parser.parse(text);
      const expression = root.commands[0].args[0] as any;

      expect(expression.location).toBeDefined();

      const sliced = text.slice(expression.location.min, expression.location.max + 1);

      expect(sliced).toBe('name LIKE ( "test*", "test2*" )');
    });

    it('LIKE list - list arg location includes parentheses', () => {
      const text = 'ROW name NOT LIKE ( "test*", "test2*" )';
      const { root } = Parser.parse(text);
      const expression = root.commands[0].args[0] as any;
      const listArg = expression.args[1];

      expect(listArg.location).toBeDefined();

      const sliced = text.slice(listArg.location.min, listArg.location.max + 1);

      expect(sliced).toBe('( "test*", "test2*" )');

      const operatorText = text.slice(
        expression.operator.location.min,
        expression.operator.location.max + 1
      );
      expect(operatorText).toBe('NOT LIKE');
    });

    it('NOT RLIKE list - location spans entire expression', () => {
      const text = 'ROW col NOT RLIKE ("a", "b", "c")';
      const { root } = Parser.parse(text);
      const expression = root.commands[0].args[0] as any;

      expect(expression.location).toBeDefined();

      const sliced = text.slice(expression.location.min, expression.location.max + 1);

      expect(sliced).toBe('col NOT RLIKE ("a", "b", "c")');
    });

    it('RLIKE list - individual list item locations', () => {
      const text = 'ROW name RLIKE ( "first", "second", "third" )';
      const { root } = Parser.parse(text);
      const expression = root.commands[0].args[0] as any;
      const listArg = expression.args[1];
      const values = listArg.values;

      const expressionText = text.slice(expression.location.min, expression.location.max + 1);

      expect(expressionText).toBe('name RLIKE ( "first", "second", "third" )');

      const leftText = text.slice(
        expression.args[0].location.min,
        expression.args[0].location.max + 1
      );
      expect(leftText).toBe('name');

      const rightText = text.slice(
        expression.args[1].location.min,
        expression.args[1].location.max + 1
      );
      expect(rightText).toBe('( "first", "second", "third" )');

      const operatorText = text.slice(
        expression.operator.location.min,
        expression.operator.location.max + 1
      );
      expect(operatorText).toBe('RLIKE');

      expect(values).toHaveLength(3);

      const first = text.slice(values[0].location.min, values[0].location.max + 1);
      expect(first).toBe('"first"');

      const second = text.slice(values[1].location.min, values[1].location.max + 1);
      expect(second).toBe('"second"');

      const third = text.slice(values[2].location.min, values[2].location.max + 1);
      expect(third).toBe('"third"');
    });
  });

  describe('lists', () => {
    it('LIKE (list)', () => {
      const text = 'ROW name LIKE ( "test*", "test2*" )';
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
            type: 'list',
            subtype: 'tuple',
            values: [
              {
                type: 'literal',
                literalType: 'keyword',
              },
              {
                type: 'literal',
                literalType: 'keyword',
              },
            ],
          },
        ],
      });
    });

    it('NOT LIKE (list)', () => {
      const text = 'ROW name NOT LIKE ( "test*", "test2*" )';
      const { root, errors } = Parser.parse(text);
      const expression = root.commands[0].args[0];

      expect(errors.length).toBe(0);
      expect(expression).toMatchObject({
        type: 'function',
        name: 'not like',
        args: [
          {
            type: 'column',
            name: 'name',
          },
          {
            type: 'list',
            subtype: 'tuple',
            values: [
              {
                type: 'literal',
                literalType: 'keyword',
              },
              {
                type: 'literal',
                literalType: 'keyword',
              },
            ],
          },
        ],
      });
    });

    it('RLIKE (list)', () => {
      const text = 'ROW name RLIKE ( "test.*", "test2.*" )';
      const { root, errors } = Parser.parse(text);
      const expression = root.commands[0].args[0];

      expect(errors.length).toBe(0);
      expect(expression).toMatchObject({
        type: 'function',
        name: 'rlike',
        args: [
          {
            type: 'column',
            name: 'name',
          },
          {
            type: 'list',
            subtype: 'tuple',
            values: [
              {
                type: 'literal',
                literalType: 'keyword',
              },
              {
                type: 'literal',
                literalType: 'keyword',
              },
            ],
          },
        ],
      });
    });

    it('NOT RLIKE (list)', () => {
      const text = 'ROW name NOT RLIKE ("a", "b", "c")';
      const { root, errors } = Parser.parse(text);
      const expression = root.commands[0].args[0];

      expect(errors.length).toBe(0);
      expect(expression).toMatchObject({
        type: 'function',
        name: 'not rlike',
        args: [
          {
            type: 'column',
            name: 'name',
          },
          {
            type: 'list',
            subtype: 'tuple',
            values: [
              {
                type: 'literal',
                literalType: 'keyword',
                valueUnquoted: 'a',
              },
              {
                type: 'literal',
                literalType: 'keyword',
                valueUnquoted: 'b',
              },
              {
                type: 'literal',
                literalType: 'keyword',
                valueUnquoted: 'c',
              },
            ],
          },
        ],
      });
    });

    it('LIKE list - single item', () => {
      const text = 'ROW name LIKE ("single")';
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
            type: 'list',
            subtype: 'tuple',
            values: [
              {
                type: 'literal',
                literalType: 'keyword',
                valueUnquoted: 'single',
              },
            ],
          },
        ],
      });
    });

    it('RLIKE list - many items', () => {
      const text = 'ROW field RLIKE ("a", "b", "c", "d", "e")';
      const { root, errors } = Parser.parse(text);
      const expression = root.commands[0].args[0];

      expect(errors.length).toBe(0);
      expect((expression as any).args[1].values).toHaveLength(5);
      expect((expression as any).args[1].values.map((v: any) => v.valueUnquoted)).toEqual([
        'a',
        'b',
        'c',
        'd',
        'e',
      ]);
    });
  });

  describe('edge cases', () => {
    it('LIKE with quoted column name', () => {
      const text = 'ROW `my field` LIKE "pattern"';
      const { root, errors } = Parser.parse(text);
      const expression = root.commands[0].args[0];

      expect(errors.length).toBe(0);
      expect((expression as any).args[0]).toMatchObject({
        type: 'column',
        name: 'my field',
        quoted: true,
      });
    });

    it('RLIKE with triple-quoted string', () => {
      const text = 'ROW field RLIKE """pattern"""';
      const { root, errors } = Parser.parse(text);
      const expression = root.commands[0].args[0];

      expect(errors.length).toBe(0);
      expect((expression as any).args[1]).toMatchObject({
        type: 'literal',
        literalType: 'keyword',
        valueUnquoted: 'pattern',
      });
    });

    it('NOT LIKE list with whitespace variations', () => {
      const text = 'ROW x NOT LIKE ("a","b"  ,  "c")';
      const { root, errors } = Parser.parse(text);
      const expression = root.commands[0].args[0];

      expect(errors.length).toBe(0);
      expect((expression as any).args[1].values).toHaveLength(3);
    });

    it('LIKE with escaped characters in pattern', () => {
      const text = 'ROW field LIKE "test\\"quote"';
      const { root, errors } = Parser.parse(text);
      const expression = root.commands[0].args[0];

      expect(errors.length).toBe(0);
      expect((expression as any).args[1]).toMatchObject({
        type: 'literal',
        literalType: 'keyword',
        valueUnquoted: 'test"quote',
      });
    });
  });

  describe('parameters', () => {
    it('LIKE with named parameter', () => {
      const text = 'ROW name LIKE ?pattern';
      const { root, errors } = Parser.parse(text);
      const expression = root.commands[0].args[0];

      expect(errors.length).toBe(0);
      expect(expression).toMatchObject({
        type: 'function',
        name: 'like',
        args: [
          { type: 'column', name: 'name' },
          { type: 'literal', literalType: 'param', paramType: 'named', value: 'pattern' },
        ],
      });
    });

    it('LIKE with positional parameter', () => {
      const text = 'ROW name LIKE ?1';
      const { root, errors } = Parser.parse(text);
      const expression = root.commands[0].args[0];

      expect(errors.length).toBe(0);
      expect(expression).toMatchObject({
        type: 'function',
        name: 'like',
        args: [
          { type: 'column', name: 'name' },
          { type: 'literal', literalType: 'param', paramType: 'positional', value: 1 },
        ],
      });
    });

    it('LIKE with unnamed parameter', () => {
      const text = 'ROW name LIKE ?';
      const { root, errors } = Parser.parse(text);
      const expression = root.commands[0].args[0];

      expect(errors.length).toBe(0);
      expect(expression).toMatchObject({
        type: 'function',
        name: 'like',
        args: [
          { type: 'column', name: 'name' },
          { type: 'literal', literalType: 'param', paramType: 'unnamed' },
        ],
      });
    });

    it('LIKE list with mixed strings and parameters', () => {
      const text = 'ROW name LIKE ("test*", ?pattern, ?1)';
      const { root, errors } = Parser.parse(text);
      const expression = root.commands[0].args[0] as any;

      expect(errors.length).toBe(0);
      expect(expression.args[1].values).toHaveLength(3);
      expect(expression.args[1].values[0]).toMatchObject({
        type: 'literal',
        literalType: 'keyword',
      });
      expect(expression.args[1].values[1]).toMatchObject({
        type: 'literal',
        literalType: 'param',
        paramType: 'named',
      });
      expect(expression.args[1].values[2]).toMatchObject({
        type: 'literal',
        literalType: 'param',
        paramType: 'positional',
      });
    });
  });
});
