/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PromQLBuilder } from '../../ast/builder';
import { PromQLParser } from '../../parser';
import { PromQLBasicPrettyPrinter } from '../basic_pretty_printer';
import type { PromQLAstExpression } from '../../types';

/**
 * Helper: build a synthetic binary expression AST node (no PromQLParens wrapper).
 */
const bin = (
  op: Parameters<typeof PromQLBuilder.expression.binary>[0],
  left: PromQLAstExpression,
  right: PromQLAstExpression
) => PromQLBuilder.expression.binary(op, left, right);

const a = PromQLBuilder.identifier('a');
const b = PromQLBuilder.identifier('b');
const c = PromQLBuilder.identifier('c');

const print = (node: PromQLAstExpression): string => PromQLBasicPrettyPrinter.expression(node);

describe('PromQL binary expression precedence, parens insertion', () => {
  describe('lower-precedence: child needs parens', () => {
    test('(a + b) * c — lower-precedence left child', () => {
      const tree = bin('*', bin('+', a, b), c);
      expect(print(tree)).toBe('(a + b) * c');
    });

    test('a + b * c — higher-precedence right child, no parens needed', () => {
      const tree = bin('+', a, bin('*', b, c));
      expect(print(tree)).toBe('a + b * c');
    });

    test('a * (b + c) — lower-precedence right child', () => {
      const tree = bin('*', a, bin('+', b, c));
      expect(print(tree)).toBe('a * (b + c)');
    });

    test('(a or b) and c — lower-precedence left child (set operators)', () => {
      const tree = bin('and', bin('or', a, b), c);
      expect(print(tree)).toBe('(a or b) and c');
    });

    test('a and b or c — higher-precedence left child, no parens needed', () => {
      const tree = bin('or', bin('and', a, b), c);
      expect(print(tree)).toBe('a and b or c');
    });

    test('(a + b) ^ c — lower-precedence left child under power', () => {
      const tree = bin('^', bin('+', a, b), c);
      expect(print(tree)).toBe('(a + b) ^ c');
    });

    test('a ^ b + c — higher-precedence left child, no parens needed', () => {
      const tree = bin('+', bin('^', a, b), c);
      expect(print(tree)).toBe('a ^ b + c');
    });

    test('a ^ (b + c) — lower-precedence right child under power', () => {
      const tree = bin('^', a, bin('+', b, c));
      expect(print(tree)).toBe('a ^ (b + c)');
    });
  });

  describe('same-precedence: associativity determines parens', () => {
    test('a - (b + c) — same-precedence right child, left-assoc - parens', () => {
      const tree = bin('-', a, bin('+', b, c));
      expect(print(tree)).toBe('a - (b + c)');
    });

    test('a - b + c — same-precedence left child, left-assoc - no parens', () => {
      const tree = bin('+', bin('-', a, b), c);
      expect(print(tree)).toBe('a - b + c');
    });

    test('a / (b * c) — same-precedence right child, left-assoc - parens', () => {
      const tree = bin('/', a, bin('*', b, c));
      expect(print(tree)).toBe('a / (b * c)');
    });

    test('a * b / c — same-precedence left child, left-assoc - no parens', () => {
      const tree = bin('/', bin('*', a, b), c);
      expect(print(tree)).toBe('a * b / c');
    });

    test('(a ^ b) ^ c — same-precedence left child, right-assoc - parens', () => {
      const tree = bin('^', bin('^', a, b), c);
      expect(print(tree)).toBe('(a ^ b) ^ c');
    });

    test('a ^ b ^ c — same-precedence right child, right-assoc - no parens', () => {
      const tree = bin('^', a, bin('^', b, c));
      expect(print(tree)).toBe('a ^ b ^ c');
    });

    test('a + (b - c) — same-precedence right child, left-assoc - parens', () => {
      const tree = bin('+', a, bin('-', b, c));
      expect(print(tree)).toBe('a + (b - c)');
    });
  });

  describe('comparison and set operators', () => {
    test('(a == b) and c — comparison left of and, lower precedence - no parens (comparison > and)', () => {
      const tree = bin('and', bin('==', a, b), c);
      expect(print(tree)).toBe('a == b and c');
    });

    test('a and (b == c) — comparison child of and, higher precedence - no parens', () => {
      const tree = bin('and', a, bin('==', b, c));
      expect(print(tree)).toBe('a and b == c');
    });

    test('(a and b) or c — and left of or - no parens (higher precedence)', () => {
      const tree = bin('or', bin('and', a, b), c);
      expect(print(tree)).toBe('a and b or c');
    });

    test('a or (b unless c) — unless right of or - no parens (higher precedence)', () => {
      const tree = bin('or', a, bin('unless', b, c));
      expect(print(tree)).toBe('a or b unless c');
    });

    test('(a or b) unless c — or left of unless - needs parens (lower precedence)', () => {
      const tree = bin('unless', bin('or', a, b), c);
      expect(print(tree)).toBe('(a or b) unless c');
    });

    test('a == (b != c) — same-precedence right child in comparison group - parens', () => {
      const tree = bin('==', a, bin('!=', b, c));
      expect(print(tree)).toBe('a == (b != c)');
    });
  });

  describe('deeply nested expressions', () => {
    test('((a + b) * c) ^ d', () => {
      const tree = bin('^', bin('*', bin('+', a, b), c), PromQLBuilder.identifier('d'));
      expect(print(tree)).toBe('((a + b) * c) ^ d');
    });

    test('a + b * c + d — natural precedence, no extra parens', () => {
      const tree = bin('+', bin('+', a, bin('*', b, c)), PromQLBuilder.identifier('d'));
      expect(print(tree)).toBe('a + b * c + d');
    });

    test('a * (b + c) * d', () => {
      const d = PromQLBuilder.identifier('d');
      const tree = bin('*', bin('*', a, bin('+', b, c)), d);
      expect(print(tree)).toBe('a * (b + c) * d');
    });
  });

  describe('non-binary children are never parenthesized', () => {
    test('literal children', () => {
      const tree = bin(
        '+',
        PromQLBuilder.expression.literal.integer(1),
        PromQLBuilder.expression.literal.integer(2)
      );
      expect(print(tree)).toBe('1 + 2');
    });

    test('function call children', () => {
      const rate = PromQLBuilder.expression.func.call('rate', [a]);
      const sum = PromQLBuilder.expression.func.call('sum', [b]);
      const tree = bin('+', rate, sum);
      expect(print(tree)).toBe('rate(a) + sum(b)');
    });

    test('unary expression child', () => {
      const neg = PromQLBuilder.expression.unary('-', a);
      const tree = bin('*', neg, b);
      expect(print(tree)).toBe('-a * b');
    });
  });

  describe('explicit PromQLParens nodes are preserved', () => {
    test('parens wrapping lower-precedence child still prints parens', () => {
      // Even with the parens node, output should have parens (double-safe)
      const tree = bin('*', PromQLBuilder.expression.parens(bin('+', a, b)), c);
      expect(print(tree)).toBe('(a + b) * c');
    });

    test('parens wrapping higher-precedence child prints parens (explicit)', () => {
      // Explicit parens node should always produce parens, even if unnecessary
      const tree = bin('+', PromQLBuilder.expression.parens(bin('*', a, b)), c);
      expect(print(tree)).toBe('(a * b) + c');
    });
  });

  describe('binary expressions with modifiers', () => {
    test('precedence with bool modifier', () => {
      const tree = PromQLBuilder.expression.binary('==', bin('+', a, b), c, { bool: true });
      expect(print(tree)).toBe('a + b == bool c');
    });

    test('lower-precedence child with bool modifier parent', () => {
      // (a or b) == bool c - or is lower precedence than comparison
      const tree = PromQLBuilder.expression.binary('==', bin('or', a, b), c, { bool: true });
      expect(print(tree)).toBe('(a or b) == bool c');
    });
  });

  describe('round-trip: parse - print - re-parse - print', () => {
    const roundTrip = (src: string) => {
      const result1 = PromQLParser.parse(src);
      expect(result1.errors).toHaveLength(0);
      const printed1 = PromQLBasicPrettyPrinter.print(result1.root);

      const result2 = PromQLParser.parse(printed1);
      expect(result2.errors).toHaveLength(0);
      const printed2 = PromQLBasicPrettyPrinter.print(result2.root);

      expect(printed2).toBe(printed1);
    };

    test('simple addition', () => roundTrip('a + b'));
    test('mixed precedence', () => roundTrip('a + b * c'));
    test('explicit parens override precedence', () => roundTrip('(a + b) * c'));
    test('power associativity', () => roundTrip('a ^ b ^ c'));
    test('comparison with bool', () => roundTrip('a == bool b'));
    test('set operators', () => roundTrip('a and b or c'));
    test('complex nested', () => roundTrip('(a + b) * c ^ d - e / f'));
  });
});
