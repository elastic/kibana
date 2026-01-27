/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '../core/parser';

describe('SET instruction parsing', () => {
  describe('single SET instruction', () => {
    test('SET with string value', () => {
      const query = 'SET timeout = "30s"; FROM index1';
      const { root } = Parser.parse(query);

      expect(root).toMatchObject({
        header: [
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: 'timeout' },
                  { type: 'literal', literalType: 'keyword', valueUnquoted: '30s' },
                ],
              },
            ],
          },
        ],
        commands: [{ name: 'from' }],
      });
    });

    test('SET with integer value', () => {
      const query = 'SET max_results = 100; FROM index1';
      const { root } = Parser.parse(query);

      expect(root).toMatchObject({
        header: [
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: 'max_results' },
                  { type: 'literal', literalType: 'integer', value: 100 },
                ],
              },
            ],
          },
        ],
        commands: [{ name: 'from' }],
      });
    });

    test('SET with null value', () => {
      const query = 'SET value = null; FROM index1';
      const { root } = Parser.parse(query);

      expect(root).toMatchObject({
        header: [
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: 'value' },
                  { type: 'literal', literalType: 'null', value: 'null' },
                ],
              },
            ],
          },
        ],
        commands: [{ name: 'from' }],
      });
    });
  });

  describe('multiple SET instructions', () => {
    test('two SET instructions with different value types', () => {
      const query = 'SET timeout = "30s"; SET max_results = 100; FROM index1';
      const { root } = Parser.parse(query);

      expect(root).toMatchObject({
        header: [
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: 'timeout' },
                  { type: 'literal', literalType: 'keyword', valueUnquoted: '30s' },
                ],
              },
            ],
          },
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: 'max_results' },
                  { type: 'literal', literalType: 'integer', value: 100 },
                ],
              },
            ],
          },
        ],
        commands: [{ name: 'from' }],
      });
    });

    test('three SET instructions', () => {
      const query = 'SET setting1 = "value1"; SET setting2 = 42; SET setting3 = true; FROM index1';
      const { root } = Parser.parse(query);

      expect(root).toMatchObject({
        header: [
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: 'setting1' },
                  { type: 'literal', literalType: 'keyword', valueUnquoted: 'value1' },
                ],
              },
            ],
          },
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: 'setting2' },
                  { type: 'literal', literalType: 'integer', value: 42 },
                ],
              },
            ],
          },
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: 'setting3' },
                  { type: 'literal', literalType: 'boolean', value: 'true' },
                ],
              },
            ],
          },
        ],
        commands: [{ name: 'from' }],
      });
    });

    test('SET instructions with complex query', () => {
      const query = `
        SET timeout = "5m";
        SET format = "json";
        FROM employees
        | WHERE salary > 50000
        | STATS avg_salary = AVG(salary) BY department
        | SORT avg_salary DESC
        | LIMIT 10
      `;
      const { root } = Parser.parse(query);

      expect(root).toMatchObject({
        header: [
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: 'timeout' },
                  { type: 'literal', literalType: 'keyword', valueUnquoted: '5m' },
                ],
              },
            ],
          },
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: 'format' },
                  { type: 'literal', literalType: 'keyword', valueUnquoted: 'json' },
                ],
              },
            ],
          },
        ],
        commands: [
          { name: 'from' },
          { name: 'where' },
          { name: 'stats' },
          { name: 'sort' },
          { name: 'limit' },
        ],
      });
    });
  });

  describe('SET instruction syntax variations', () => {
    test('SET with quoted identifier', () => {
      const query = 'SET `special-setting` = "value"; FROM index1';
      const { root } = Parser.parse(query);

      expect(root).toMatchObject({
        header: [
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: '`special-setting`' },
                  { type: 'literal', literalType: 'keyword', valueUnquoted: 'value' },
                ],
              },
            ],
          },
        ],
        commands: [{ name: 'from' }],
      });
    });

    test('SET with multiline string value', () => {
      const query = 'SET description = "This is a\\nmultiline\\nvalue"; FROM index1';
      const { root } = Parser.parse(query);

      expect(root).toMatchObject({
        header: [
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: 'description' },
                  {
                    type: 'literal',
                    literalType: 'keyword',
                    valueUnquoted: 'This is a\nmultiline\nvalue',
                  },
                ],
              },
            ],
          },
        ],
        commands: [{ name: 'from' }],
      });
    });

    test('SET with empty string value', () => {
      const query = 'SET empty = ""; FROM index1';
      const { root } = Parser.parse(query);

      expect(root).toMatchObject({
        header: [
          {
            type: 'header-command',
            name: 'set',
            args: [
              {
                type: 'function',
                subtype: 'binary-expression',
                name: '=',
                args: [
                  { type: 'identifier', name: 'empty' },
                  { type: 'literal', literalType: 'keyword', valueUnquoted: '' },
                ],
              },
            ],
          },
        ],
        commands: [{ name: 'from' }],
      });
    });

    test('SET with large number', () => {
      const query = 'SET max_memory = 1073741824; FROM index1';
      const { root } = Parser.parse(query);

      expect(root.header).toHaveLength(1);

      const setInstruction = root.header![0];
      expect(setInstruction.name).toBe('set');
      expect((setInstruction.args[0] as any).args[0].name).toBe('max_memory');
      expect((setInstruction.args[0] as any).args[1].value).toBe(1073741824);
    });
  });

  describe('SET with complex identifier names', () => {
    test('SET with dotted identifier', () => {
      const query = 'SET `elasticsearch.timeout` = "30s"; FROM index1';
      const { root } = Parser.parse(query);

      expect(root.header).toHaveLength(1);

      const setInstruction = root.header![0];
      expect(setInstruction.name).toBe('set');
      expect((setInstruction.args[0] as any).args[0].name).toBe('`elasticsearch.timeout`');
      expect((setInstruction.args[0] as any).args[1].valueUnquoted).toBe('30s');
    });

    test('SET with identifier containing numbers', () => {
      const query = 'SET setting123 = "value"; FROM index1';
      const { root } = Parser.parse(query);

      expect(root.header).toHaveLength(1);

      const setInstruction = root.header![0];
      expect(setInstruction.name).toBe('set');
      expect((setInstruction.args[0] as any).args[0].name).toBe('setting123');
      expect((setInstruction.args[0] as any).args[1].valueUnquoted).toBe('value');
    });

    test('SET with identifier containing underscores', () => {
      const query = 'SET max_field_length = 1000; FROM index1';
      const { root } = Parser.parse(query);

      expect(root.header).toHaveLength(1);

      const setInstruction = root.header![0];
      expect(setInstruction.name).toBe('set');
      expect((setInstruction.args[0] as any).args[0].name).toBe('max_field_length');
      expect((setInstruction.args[0] as any).args[1].value).toBe(1000);
    });
  });

  describe('SET with special string values', () => {
    test('SET with JSON-like string value and URL value', () => {
      const query =
        'SET config = "{\\"key\\": \\"value\\"}"; SET endpoint = "https://example.com/api/v1"; FROM index1';
      const { root } = Parser.parse(query);

      expect(root.header).toHaveLength(2);

      const setInstruction = root.header![0];
      expect(setInstruction.name).toBe('set');
      expect((setInstruction.args[0] as any).args[0].name).toBe('config');
      expect((setInstruction.args[0] as any).args[1].valueUnquoted).toBe('{"key": "value"}');
      const setInstruction2 = root.header![1];
      expect((setInstruction2.args[0] as any).args[0].name).toBe('endpoint');
      expect((setInstruction2.args[0] as any).args[1].valueUnquoted).toBe(
        'https://example.com/api/v1'
      );
    });
  });

  describe('Incomplete SET instructions', () => {
    test('SET without identifier', () => {
      const query = 'SET ';
      const { root, errors } = Parser.parse(query);

      expect(errors).toHaveLength(1);
      expect(root.header).toHaveLength(1);
      expect(root.header![0]).toMatchObject({
        type: 'header-command',
        name: 'set',
        args: [], // Should have empty args
        incomplete: true,
      });
    });

    test('SET without equals and value', () => {
      const query = 'SET timezone ';
      const { root, errors } = Parser.parse(query);

      expect(errors).toHaveLength(1);
      expect(root.header).toHaveLength(1);
      expect(root.header![0]).toMatchObject({
        type: 'header-command',
        name: 'set',
        args: [], // as no `=` is present, it's not enough to identify/build a binary expression
        incomplete: true,
      });
    });

    test('SET with identifier but missing value', () => {
      const query = 'SET timezone = ';
      const { root, errors } = Parser.parse(query);

      expect(errors).toHaveLength(1);
      expect(root.header).toHaveLength(1);
      expect(root.header![0]).toMatchObject({
        type: 'header-command',
        name: 'set',
        args: [
          {
            type: 'function',
            subtype: 'binary-expression',
            name: '=',
            args: [{ type: 'identifier', name: 'timezone' }, []],
            incomplete: true,
          },
        ],
        incomplete: true,
      });
    });
  });
});
