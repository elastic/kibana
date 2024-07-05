/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLColumn, ESQLLiteral, getAstAndSyntaxErrors } from '../..';
import { walk, Walker } from './walker';

test('can walk all functions', () => {
  const { ast } = getAstAndSyntaxErrors('METRICS index a(b(c(foo)))');
  const functions: string[] = [];

  walk(ast, {
    visitFunction: (fn) => functions.push(fn.name),
  });

  expect(functions.sort()).toStrictEqual(['a', 'b', 'c']);
});

test('can walk "columns"', () => {
  const query = 'ROW x = 1';
  const { ast } = getAstAndSyntaxErrors(query);
  const columns: ESQLColumn[] = [];

  walk(ast, {
    visitColumn: (node) => columns.push(node),
  });

  expect(columns).toMatchObject([
    {
      type: 'column',
      name: 'x',
    },
  ]);
});

test('can walk literals', () => {
  const query = 'ROW x = 1';
  const { ast } = getAstAndSyntaxErrors(query);
  const columns: ESQLLiteral[] = [];

  walk(ast, {
    visitLiteral: (node) => columns.push(node),
  });

  expect(columns).toMatchObject([
    {
      type: 'literal',
      name: '1',
    },
  ]);
});

test('can collect all params', () => {
  const query = 'ROW x = ?';
  const { ast } = getAstAndSyntaxErrors(query);
  const params = Walker.params(ast);

  expect(params).toMatchObject([
    {
      type: 'literal',
      literalType: 'param',
      paramType: 'unnamed',
    },
  ]);
});
