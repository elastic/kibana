/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '../../parser';
import { printAst } from '../print_ast';

test('can print a basic "FROM index" query AST', () => {
  const { root } = Parser.parse('FROM index');
  const text = printAst(root);

  expect('\n' + text).toBe(`
query 0-9
└─ command 0-9 "from"
   └─ source 5-9 "index"
      └─ literal 5-9 ""index""`);
});

test('can print a basic "FROM index" with .text field contents', () => {
  const { root } = Parser.parse('FROM index');
  const text = printAst(root, { text: true });

  expect('\n' + text).toBe(`
query 0-9, text = "FROMindex"
└─ command 0-9 "from", text = "FROMindex"
   └─ source 5-9 "index", text = "index"
      └─ literal 5-9 ""index"", text = "index"`);
});

test('can print a basic \'ROW 123, "foo"\' query AST', () => {
  const { root } = Parser.parse('ROW 123, "foo"');
  const text = printAst(root);

  expect('\n' + text).toBe(`
query 0-13
└─ command 0-13 "row"
   ├─ literal 4-6 "123"
   └─ literal 9-13 ""foo""`);
});

test('can print only node types in "compact" mode', () => {
  const { root } = Parser.parse('ROW 123, "foo"');
  const text = printAst(root, { compact: true });

  expect('\n' + text).toBe(`
query
└─ command
   ├─ literal
   └─ literal`);
});

test('can limit tree depth with "depth" option', () => {
  const { root } = Parser.parse(
    'FROM a | STATS fn = count(a * (1 + 3), {"adf": 123}) BY b | LIMIT 123'
  );
  const text = printAst(root, { depth: 3 });

  expect('\n' + text).toBe(`
query 0-5
├─ command 0-5 "from"
│  └─ source 5-5 "a"
│     └─ ...
├─ command 9-56 "stats"
│  ├─ function 15-51 "="
│  │  └─ ...
│  └─ option 53-56 "by"
│     └─ ...
└─ command 60-68 "limit"
   └─ literal 66-68 "123"
      └─ ...`);
});

test('can limit total number of nodes printed with "limit" option', () => {
  const { root } = Parser.parse(
    'FROM a | STATS fn = count(a * (1 + 3), {"adf": 123}) BY b | LIMIT 123'
  );
  const text = printAst(root, { depth: 3, limit: 5 });

  expect('\n' + text).toBe(`
query 0-5
├─ command 0-5 "from"
│  └─ source 5-5 "a"
│     └─ ...
├─ command 9-56 "stats"
│  ├─ function 15-51 "="
│  │  └─ ...
│  └─ ...
└─ ...`);
});
