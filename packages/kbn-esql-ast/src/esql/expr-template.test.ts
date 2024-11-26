/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BasicPrettyPrinter } from '../pretty_print';
import { expr } from './expr';

test('can be used as templated string tag', () => {
  const node = expr`42`;

  expect(node).toMatchObject({
    type: 'literal',
    literalType: 'integer',
    name: '42',
    value: 42,
  });
});

test('can specify parsing options', () => {
  const node1 = expr({ withFormatting: true })`42 /* comment */`;
  const node2 = expr({ withFormatting: false })`42 /* comment */`;
  const text1 = BasicPrettyPrinter.expression(node1);
  const text2 = BasicPrettyPrinter.expression(node2);

  expect(text1).toBe('42 /* comment */');
  expect(text2).toBe('42');
});

test('can compose nodes into templated string', () => {
  const field = expr`a.b.c`;
  const value = expr`fn(1, ${field})`;
  const assignment = expr`${field} = ${value}`;
  const text = BasicPrettyPrinter.expression(assignment);

  expect(text).toBe('a.b.c = FN(1, a.b.c)');
});
