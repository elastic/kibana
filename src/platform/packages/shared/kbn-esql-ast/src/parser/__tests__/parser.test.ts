/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '..';

describe('Parser.parseExpression()', () => {
  it('can parse an integer literal', () => {
    const src = '123';
    const { root, errors } = Parser.parseExpression(src);

    expect(errors.length).toBe(0);
    expect(root).toMatchObject({
      type: 'literal',
      value: 123,
      literalType: 'integer',
    });
  });

  it('throws when attempting to parse multiple expressions', () => {
    const src = '123, 456';

    expect(() => Parser.parseExpression(src)).toThrow();
  });

  it('throws on invalid expression', () => {
    const src = '.';

    expect(() => Parser.parseExpression(src)).toThrow();
  });

  it('can parse a function call', () => {
    const src = '/* comment */ agg(123, "asdf", FALSE)';
    const { root, errors } = Parser.parseExpression(src);

    expect(errors.length).toBe(0);
    expect(root).toMatchObject({
      type: 'function',
      name: 'agg',
    });
  });

  it('can parse a binary "+" expression', () => {
    const src = 'count(*) + 1';
    const { root, errors } = Parser.parseExpression(src);

    expect(errors.length).toBe(0);
    expect(root).toMatchObject({
      type: 'function',
      name: '+',
      args: [
        {
          type: 'function',
          name: 'count',
        },
        {
          type: 'literal',
          value: 1,
          literalType: 'integer',
        },
      ],
    });
  });

  it('can parse a map expression', () => {
    const src = '/* comment */ {"foo": "bar", "baz": 123}';
    const { root, errors } = Parser.parseExpression(src);

    expect(errors.length).toBe(0);
    expect(root).toMatchObject({
      type: 'map',
      entries: [
        {
          type: 'map-entry',
          key: {
            type: 'literal',
            valueUnquoted: 'foo',
            literalType: 'keyword',
          },
          value: {
            type: 'literal',
            valueUnquoted: 'bar',
            literalType: 'keyword',
          },
        },
        {
          type: 'map-entry',
          key: {
            type: 'literal',
            valueUnquoted: 'baz',
            literalType: 'keyword',
          },
          value: {
            type: 'literal',
            value: 123,
            literalType: 'integer',
          },
        },
      ],
    });
  });
});

describe('Parser.parseCommand()', () => {
  it('can parse a single source command', () => {
    const src = ' ROW 123';
    const { root, errors } = Parser.parseCommand(src);

    expect(errors.length).toBe(0);
    expect(root).toMatchObject({
      type: 'command',
      name: 'row',
      args: [
        {
          type: 'literal',
          value: 123,
          literalType: 'integer',
        },
      ],
    });
  });

  it('can parse a single processing command', () => {
    const src = ' LIMIT 123';
    const { root, errors } = Parser.parseCommand(src);

    expect(errors.length).toBe(0);
    expect(root).toMatchObject({
      type: 'command',
      name: 'limit',
      args: [
        {
          type: 'literal',
          value: 123,
          literalType: 'integer',
        },
      ],
    });
  });

  it('throws when trying to parse multiple commands', () => {
    const src = 'FROM index | LIMIT 123';

    expect(() => Parser.parseCommand(src)).toThrow();
  });
});
