/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter } from '../../../pretty_print';
import { exp } from '../expression';

test('can be used as templated string tag', () => {
  const node = exp`42`;

  expect(node).toMatchObject({
    type: 'literal',
    literalType: 'integer',
    name: '42',
    value: 42,
  });
});

test('throws on invalid expression', () => {
  expect(() => exp`.`).toThrow();
});

test('can specify parsing options', () => {
  const node1 = exp({ withFormatting: true })`42 /* comment */`;
  const node2 = exp({ withFormatting: false })`42 /* comment */`;
  const text1 = BasicPrettyPrinter.expression(node1);
  const text2 = BasicPrettyPrinter.expression(node2);

  expect(text1).toBe('42 /* comment */');
  expect(text2).toBe('42');
});

test('can compose nodes into templated string', () => {
  const field = exp`a.b.c`;
  const value = exp`fn(1, ${field})`;
  const assignment = exp`${field} = ${value}`;
  const text = BasicPrettyPrinter.expression(assignment);

  expect(text).toBe('a.b.c = FN(1, a.b.c)');
});

test('creates a list of nodes separated by command, if array passed in', () => {
  const arg1 = exp`1`;
  const arg2 = exp`a.b.c`;
  const value = exp`fn(${[arg1, arg2]})`;
  const text = BasicPrettyPrinter.expression(value);

  expect(text).toBe('FN(1, a.b.c)');
});
