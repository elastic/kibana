/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '..';
import { printAst } from '../../debug';

describe('Column Bracketed Syntax: [qualifier].[name]', () => {
  describe('STATS', () => {
    it('can parse a column without qualifier', () => {
      const text = 'ROW name = 123';
      const { root } = Parser.parse(text);

      expect('\n' + printAst(root)).toBe(`
query 0-13
└─ command 0-13 "row"
   └─ function 4-13 "="
      ├─ column 4-7 "name"
      │  └─ identifier 4-7 "name"
      └─ literal 11-13 "123"`);
    });

    it('can parse a column with a qualifier and name', () => {
      const text = 'ROW [qualifier].[name] = 123';
      const { root } = Parser.parse(text);

      expect('\n' + printAst(root)).toBe(`
query 0-27
└─ command 0-27 "row"
   └─ function 4-27 "="
      ├─ column 4-21 "[qualifier].[name]"
      │  ├─ identifier 5-13 "qualifier"
      │  └─ identifier 17-20 "name"
      └─ literal 25-27 "123"`);

      expect(root).toMatchObject({
        type: 'query',
        commands: [
          {
            type: 'command',
            name: 'row',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  {
                    type: 'column',
                    qualifier: {
                      type: 'identifier',
                      name: 'qualifier',
                    },
                    args: [
                      {
                        type: 'identifier',
                        name: 'qualifier',
                      },
                      {
                        type: 'identifier',
                        name: 'name',
                      },
                    ],
                  },
                  expect.any(Object),
                ],
              },
            ],
          },
        ],
      });
    });

    it('can parse a column with a qualifier and nested name', () => {
      const text = 'ROW [qualifier].[nested.name.column] = 123';
      const { root } = Parser.parse(text);

      expect('\n' + printAst(root)).toBe(`
query 0-41
└─ command 0-41 "row"
   └─ function 4-41 "="
      ├─ column 4-35 "[qualifier].[nested.name.column]"
      │  ├─ identifier 5-13 "qualifier"
      │  ├─ identifier 17-22 "nested"
      │  ├─ identifier 24-27 "name"
      │  └─ identifier 29-34 "column"
      └─ literal 39-41 "123"`);
    });
  });

  describe('KEEP', () => {
    it('can parse a column without qualifier', () => {
      const text = 'FROM index | KEEP col';
      const { root } = Parser.parse(text);

      expect('\n' + printAst(root)).toBe(`
query 0-9
├─ command 0-9 "from"
│  └─ source 5-9 "index"
│     └─ literal 5-9 ""index""
└─ command 13-20 "keep"
   └─ column 18-20 "col"
      └─ identifier 18-20 "col"`);
    });

    it('can parse a column WITH qualifier', () => {
      const text = 'FROM index | KEEP [qualifier].[col]';
      const { root } = Parser.parse(text);

      expect('\n' + printAst(root)).toBe(`
query 0-9
├─ command 0-9 "from"
│  └─ source 5-9 "index"
│     └─ literal 5-9 ""index""
└─ command 13-34 "keep"
   └─ column 18-34 "[qualifier].[col]"
      ├─ identifier 19-27 "qualifier"
      └─ identifier 31-33 "col"`);
    });
  });

  describe('Boolean expressions', () => {
    it('can parse a column with qualifier in the left side of boolean expression', () => {
      const text = 'FROM index | WHERE [qualifier].[col] == 10 AND [qualifier2].[col2] > 5';
      const { root } = Parser.parse(text);

      expect('\n' + printAst(root)).toBe(`
query 0-9
├─ command 0-9 "from"
│  └─ source 5-9 "index"
│     └─ literal 5-9 ""index""
└─ command 13-69 "where"
   └─ function 19-69 "and"
      ├─ function 19-41 "=="
      │  ├─ column 19-35 "[qualifier].[col]"
      │  │  ├─ identifier 20-28 "qualifier"
      │  │  └─ identifier 32-34 "col"
      │  └─ literal 40-41 "10"
      └─ function 47-69 ">"
         ├─ column 47-65 "[qualifier2].[col2]"
         │  ├─ identifier 48-57 "qualifier2"
         │  └─ identifier 61-64 "col2"
         └─ literal 69-69 "5"`);
    });

    it('can parse a column with qualifier in the right side of boolean expression', () => {
      const text = 'FROM index | WHERE col1 == [qualifier].[col2]';
      const { root } = Parser.parse(text);

      expect('\n' + printAst(root)).toBe(`
query 0-9
├─ command 0-9 "from"
│  └─ source 5-9 "index"
│     └─ literal 5-9 ""index""
└─ command 13-44 "where"
   └─ function 19-44 "=="
      ├─ column 19-22 "col1"
      │  └─ identifier 19-22 "col1"
      └─ column 27-44 "[qualifier].[col2]"
         ├─ identifier 28-36 "qualifier"
         └─ identifier 40-43 "col2"`);
    });
  });
});
