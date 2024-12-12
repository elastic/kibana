/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter } from '../../pretty_print';
import { ESQLProperNode } from '../../types';
import { Walker } from '../../walker/walker';
import { expr } from '../expr';

test('can generate integer literal', () => {
  const node = expr('42');

  expect(node).toMatchObject({
    type: 'literal',
    literalType: 'integer',
    name: '42',
    value: 42,
  });
});

test('can generate integer literal and keep comment', () => {
  const node = expr('42 /* my 42 */');

  expect(node).toMatchObject({
    type: 'literal',
    literalType: 'integer',
    value: 42,
    formatting: {
      right: [
        {
          type: 'comment',
          subtype: 'multi-line',
          text: ' my 42 ',
        },
      ],
    },
  });
});

test('can generate a function call expression', () => {
  const node = expr('fn(1, "test")');

  expect(node).toMatchObject({
    type: 'function',
    name: 'fn',
    args: [
      {
        type: 'literal',
        literalType: 'integer',
        value: 1,
      },
      {
        type: 'literal',
        literalType: 'keyword',
        value: '"test"',
      },
    ],
  });
});

test('can generate assignment expression', () => {
  const src = 'a.b.c = AGG(123)';
  const node = expr(src);
  const text = BasicPrettyPrinter.expression(node);

  expect(text).toBe(src);
});

test('can generate comparison expression', () => {
  const src = 'a.b.c >= FN(123)';
  const node = expr(src);
  const text = BasicPrettyPrinter.expression(node);

  expect(text).toBe(src);
});

describe('can generate various expression types', () => {
  const cases: Array<[name: string, src: string]> = [
    ['integer', '42'],
    ['negative integer', '-24'],
    ['zero', '0'],
    ['float', '3.14'],
    ['negative float', '-1.23'],
    ['string', '"doge"'],
    ['empty string', '""'],
    ['integer list', '[1, 2, 3]'],
    ['string list', '["a", "b"]'],
    ['boolean list', '[TRUE, FALSE]'],
    ['time interval', '1d'],
    ['cast', '"doge"::INTEGER'],
    ['addition', '1 + 2'],
    ['multiplication', '2 * 2'],
    ['parens', '2 * (2 + 3)'],
    ['star function call', 'FN(*)'],
    ['function call with one argument', 'FN(1)'],
    ['nested function calls', 'FN(1, MAX("asdf"))'],
    ['basic field', 'col'],
    ['nested field', 'a.b.c'],
    ['unnamed param', '?'],
    ['named param', '?hello'],
    ['positional param', '?123'],
    ['param in nested field', 'a.?b.c'],
    ['escaped field', '`😎`'],
    ['nested escaped field', 'emoji.`😎`'],
    ['simple assignment', 't = NOW()'],
    ['assignment expression', 'bytes_transform = ROUND(total_bytes / 1000000.0, 1)'],
    [
      'assignment with time intervals',
      'key = CASE(timestamp < (t - 1 hour) AND timestamp > (t - 2 hour), "Last hour", "Other")',
    ],
    [
      'assignment with casts',
      'total_visits = TO_DOUBLE(COALESCE(count_last_hour, 0::LONG) + COALESCE(count_rest, 0::LONG))',
    ],
  ];

  for (const [name, src] of cases) {
    test(name, () => {
      const node = expr(src);
      const text = BasicPrettyPrinter.expression(node);

      expect(text).toBe(src);
    });
  }
});

test('parser fields are empty', () => {
  const src = 'a.b.c >= FN(123)';
  const ast = expr(src);

  const assertParserFields = (node: ESQLProperNode) => {
    expect(node.location.min).toBe(0);
    expect(node.location.max).toBe(0);
    expect(node.text).toBe('');
    expect(node.incomplete).toBe(false);
  };

  Walker.walk(ast, {
    visitAny: (node: ESQLProperNode) => {
      assertParserFields(node);
    },
  });
});
