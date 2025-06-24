/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
import { ESQLCommand, ESQLIdentifier, ESQLLiteral, ESQLStringLiteral } from '../../types';
import { walk, Walker } from '../walker';

describe('traversal order', () => {
  describe('command arguments', () => {
    test('by default walks in "forward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM a, b, c');
      const sources: string[] = [];

      walk(ast, {
        visitSource: (src) => sources.push(src.name),
      });

      expect(sources).toStrictEqual(['a', 'b', 'c']);
    });

    test('can explicitly specify "forward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM a, b, c');
      const sources: string[] = [];

      walk(ast, {
        visitSource: (src) => sources.push(src.name),
        order: 'forward',
      });

      expect(sources).toStrictEqual(['a', 'b', 'c']);
    });

    test('can walk sources in "backward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM a, b, c');
      const sources: string[] = [];

      walk(ast, {
        visitSource: (src) => sources.push(src.name),
        order: 'backward',
      });

      expect(sources).toStrictEqual(['c', 'b', 'a']);
    });
  });

  describe('array of expressions', () => {
    test('by default walks in "forward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM a, b, c');
      const sources: string[] = [];
      const walker = new Walker({
        visitSource: (src) => sources.push(src.name),
      });

      walker.walkExpression(ast.commands[0].args);

      expect(sources).toStrictEqual(['a', 'b', 'c']);
    });

    test('can explicitly specify "forward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM a, b, c');
      const sources: string[] = [];
      const walker = new Walker({
        visitSource: (src) => sources.push(src.name),
        order: 'forward',
      });

      walker.walkExpression(ast.commands[0].args);

      expect(sources).toStrictEqual(['a', 'b', 'c']);
    });

    test('can walk sources in "backward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM a, b, c');
      const sources: string[] = [];
      const walker = new Walker({
        visitSource: (src) => sources.push(src.name),
        order: 'backward',
      });

      walker.walkExpression(ast.commands[0].args);

      expect(sources).toStrictEqual(['c', 'b', 'a']);
    });
  });

  describe('option arguments', () => {
    test('by default walks in "forward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM index METADATA a, b, c');
      const sources: string[] = [];

      walk(ast, {
        visitColumn: (src) => sources.push(src.name),
      });

      expect(sources).toStrictEqual(['a', 'b', 'c']);
    });

    test('can explicitly specify "forward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM index METADATA a, b, c');
      const sources: string[] = [];

      walk(ast, {
        visitColumn: (src) => sources.push(src.name),
        order: 'forward',
      });

      expect(sources).toStrictEqual(['a', 'b', 'c']);
    });

    test('can walk fields in "backward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM index METADATA a, b, c');
      const sources: string[] = [];

      walk(ast, {
        visitColumn: (src) => sources.push(src.name),
        order: 'backward',
      });

      expect(sources).toStrictEqual(['c', 'b', 'a']);
    });
  });

  describe('list elements', () => {
    test('by default walks in "forward" order', () => {
      const { ast } = EsqlQuery.fromSrc('ROW a = [1, 2, 3]');
      const numbers = Walker.matchAll(ast, { type: 'literal' }) as ESQLLiteral[];

      expect(numbers.map((n) => n.value)).toStrictEqual([1, 2, 3]);
    });

    test('in "backward" order', () => {
      const { ast } = EsqlQuery.fromSrc('ROW a = [1, 2, 3]');
      const numbers = Walker.matchAll(
        ast,
        { type: 'literal' },
        { order: 'backward' }
      ) as ESQLLiteral[];

      expect(numbers.map((n) => n.value)).toStrictEqual([3, 2, 1]);
    });
  });

  describe('column fields', () => {
    test('in "forward" order', () => {
      const { ast } = EsqlQuery.fromSrc('ROW a.b.c = 123');
      const numbers = Walker.matchAll(ast, { type: 'identifier' }) as ESQLIdentifier[];

      expect(numbers.map((n) => n.name)).toStrictEqual(['a', 'b', 'c']);
    });

    test('in "backward" order', () => {
      const { ast } = EsqlQuery.fromSrc('ROW a.b.c = 123');
      const numbers = Walker.matchAll(
        ast,
        { type: 'identifier' },
        { order: 'backward' }
      ) as ESQLIdentifier[];

      expect(numbers.map((n) => n.name)).toStrictEqual(['c', 'b', 'a']);
    });
  });

  describe('function arguments', () => {
    test('in "forward" order', () => {
      const { ast } = EsqlQuery.fromSrc('ROW avg(1, 2)');
      const numbers = Walker.matchAll(ast, { type: 'literal' }) as ESQLLiteral[];

      expect(numbers.map((n) => n.value)).toStrictEqual([1, 2]);
    });

    test('in "backward" order', () => {
      const { ast } = EsqlQuery.fromSrc('ROW avg(1, 2)');
      const numbers = Walker.matchAll(
        ast,
        { type: 'literal' },
        { order: 'backward' }
      ) as ESQLLiteral[];

      expect(numbers.map((n) => n.value)).toStrictEqual([2, 1]);
    });
  });

  describe('map entries', () => {
    test('in "forward" order', () => {
      const { ast } = EsqlQuery.fromSrc('ROW avg(1, {"a": "b", "c": "d"})');
      const numbers = Walker.matchAll(ast, {
        type: 'literal',
        literalType: 'keyword',
      }) as ESQLStringLiteral[];

      expect(numbers.map((n) => n.valueUnquoted)).toStrictEqual(['a', 'b', 'c', 'd']);
    });

    test('in "backward" order', () => {
      const { ast } = EsqlQuery.fromSrc('ROW avg(1, {"a": "b", "c": "d"})');
      const numbers = Walker.matchAll(
        ast,
        {
          type: 'literal',
          literalType: 'keyword',
        },
        { order: 'backward' }
      ) as ESQLStringLiteral[];

      expect(numbers.map((n) => n.valueUnquoted)).toStrictEqual(['d', 'c', 'b', 'a']);
    });
  });

  describe('commands', () => {
    test('in "forward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM a | LIMIT 1');
      const numbers = Walker.matchAll(
        ast,
        {
          type: 'command',
        },
        { order: 'forward' }
      ) as ESQLCommand[];

      expect(numbers.map((n) => n.name)).toStrictEqual(['from', 'limit']);
    });

    test('in "backward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM a | LIMIT 1');
      const numbers = Walker.matchAll(
        ast,
        {
          type: 'command',
        },
        { order: 'backward' }
      ) as ESQLCommand[];

      expect(numbers.map((n) => n.name)).toStrictEqual(['limit', 'from']);
    });
  });

  describe('source components', () => {
    test('in "forward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM a:b');
      const numbers = Walker.matchAll(
        ast,
        { type: 'literal' },
        { order: 'forward' }
      ) as ESQLLiteral[];

      expect(numbers.map((n) => n.value)).toStrictEqual(['a', 'b']);
    });

    test('in "forward" order (selector)', () => {
      const { ast } = EsqlQuery.fromSrc('FROM a::b');
      const numbers = Walker.matchAll(
        ast,
        { type: 'literal' },
        { order: 'forward' }
      ) as ESQLLiteral[];

      expect(numbers.map((n) => n.value)).toStrictEqual(['a', 'b']);
    });

    test('in "backward" order', () => {
      const { ast } = EsqlQuery.fromSrc('FROM a:b');
      const numbers = Walker.matchAll(
        ast,
        { type: 'literal' },
        { order: 'backward' }
      ) as ESQLLiteral[];

      expect(numbers.map((n) => n.value)).toStrictEqual(['b', 'a']);
    });

    test('in "backward" order (selector)', () => {
      const { ast } = EsqlQuery.fromSrc('FROM a::b');
      const numbers = Walker.matchAll(
        ast,
        { type: 'literal' },
        { order: 'backward' }
      ) as ESQLLiteral[];

      expect(numbers.map((n) => n.value)).toStrictEqual(['b', 'a']);
    });
  });
});
