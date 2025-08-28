/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '..';
import type { ESQLLiteral } from '../../types';

describe('literal expression', () => {
  it('NULL', () => {
    const text = 'ROW NULL';
    const { ast } = parse(text);
    const literal = ast[0].args[0] as ESQLLiteral;

    expect(literal).toMatchObject({
      type: 'literal',
      literalType: 'null',
      name: 'NULL',
      value: 'NULL',
    });
  });

  it('numeric expression captures "value", and "name" fields', () => {
    const text = 'ROW 1';
    const { root } = parse(text);
    const literal = root.commands[0].args[0] as ESQLLiteral;

    expect(literal).toMatchObject({
      type: 'literal',
      literalType: 'integer',
      name: '1',
      value: 1,
    });
  });

  it('doubles vs integers', () => {
    const text = 'ROW a(1.0, 1)';
    const { root } = parse(text);

    expect(root.commands[0]).toMatchObject({
      type: 'command',
      args: [
        {
          type: 'function',
          args: [
            {
              type: 'literal',
              literalType: 'double',
            },
            {
              type: 'literal',
              literalType: 'integer',
            },
          ],
        },
      ],
    });
  });

  describe('string', () => {
    describe('single quoted', () => {
      it('empty string', () => {
        const text = 'ROW "", 1';
        const { root } = parse(text);

        expect(root.commands[0]).toMatchObject({
          type: 'command',
          args: [
            {
              type: 'literal',
              literalType: 'keyword',
              name: '""',
              valueUnquoted: '',
            },
            {},
          ],
        });
      });

      it('short string', () => {
        const text = 'ROW "abc", 1';
        const { root } = parse(text);

        expect(root.commands[0]).toMatchObject({
          type: 'command',
          args: [
            {
              type: 'literal',
              literalType: 'keyword',
              name: '"abc"',
              valueUnquoted: 'abc',
            },
            {},
          ],
        });
      });

      it('escaped characters', () => {
        const text = 'ROW "a\\nb\\tc\\rd\\\\e\\"f", 1';
        const { root } = parse(text);

        expect(root.commands[0]).toMatchObject({
          type: 'command',
          args: [
            {
              type: 'literal',
              literalType: 'keyword',
              name: '"a\\nb\\tc\\rd\\\\e\\"f"',
              valueUnquoted: 'a\nb\tc\rd\\e"f',
            },
            {},
          ],
        });
      });

      it('escape double-quote before backslash', () => {
        const text = `ROW "a\\"\\\\b", 1`;
        const { root } = parse(text);

        expect(root.commands[0]).toMatchObject({
          type: 'command',
          args: [
            {
              type: 'literal',
              literalType: 'keyword',
              name: '"a\\"\\\\b"',
              valueUnquoted: 'a"\\b',
            },
            {},
          ],
        });
      });

      it('escape backslash before double-quote', () => {
        const text = `ROW "a\\\\\\"b", 1`;
        const { root } = parse(text);

        expect(root.commands[0]).toMatchObject({
          type: 'command',
          args: [
            {
              type: 'literal',
              literalType: 'keyword',
              name: '"a\\\\\\"b"',
              valueUnquoted: 'a\\"b',
            },
            {},
          ],
        });
      });
    });

    describe('triple quoted', () => {
      it('empty string', () => {
        const text = 'ROW """""", 1';
        const { root } = parse(text);

        expect(root.commands[0]).toMatchObject({
          type: 'command',
          args: [
            {
              type: 'literal',
              literalType: 'keyword',
              name: '""""""',
              valueUnquoted: '',
            },
            {},
          ],
        });
      });

      it('short string', () => {
        const text = 'ROW """abc""", 1';
        const { root } = parse(text);

        expect(root.commands[0]).toMatchObject({
          type: 'command',
          args: [
            {
              type: 'literal',
              literalType: 'keyword',
              name: '"""abc"""',
              valueUnquoted: 'abc',
            },
            {},
          ],
        });
      });

      it('characters are not escaped', () => {
        const text = 'ROW """a\\nb\\c\\"d""", 1';
        const { root } = parse(text);

        expect(root.commands[0]).toMatchObject({
          type: 'command',
          args: [
            {
              type: 'literal',
              literalType: 'keyword',
              name: '"""a\\nb\\c\\"d"""',
              valueUnquoted: 'a\\nb\\c\\"d',
            },
            {},
          ],
        });
      });
    });
  });
});
