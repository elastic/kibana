/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '.';
import { BasicPrettyPrinter } from '../pretty_print';

describe('command', () => {
  test('can create a LIMIT command', () => {
    const node = Builder.command({
      name: 'limit',
      args: [Builder.expression.literal.integer(10)],
    });
    const text = BasicPrettyPrinter.command(node);

    expect(text).toBe('LIMIT 10');
  });

  test('can create a FROM command with BY option', () => {
    const node = Builder.command({
      name: 'from',
      args: [
        Builder.expression.source.node({ index: 'my_index', sourceType: 'index' }),
        Builder.option({
          name: 'by',
          args: [
            Builder.expression.column({
              args: [Builder.identifier({ name: '_id' })],
            }),
            Builder.expression.column({
              args: [Builder.identifier('_source')],
            }),
          ],
        }),
      ],
    });
    const text = BasicPrettyPrinter.command(node);

    expect(text).toBe('FROM my_index BY _id, _source');
  });
});

describe('function', () => {
  test('can mint a binary expression', () => {
    const node = Builder.expression.func.binary('+', [
      Builder.expression.literal.integer(1),
      Builder.expression.literal.integer(2),
    ]);
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('1 + 2');
  });

  test('can mint a unary expression', () => {
    const node = Builder.expression.func.unary('not', Builder.expression.literal.integer(123));
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('NOT 123');
  });

  test('can mint "-" unary expression', () => {
    const node = Builder.expression.func.unary('-', Builder.expression.literal.integer(123));
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('-123');
  });

  test('can mint a unary postfix expression', () => {
    const node = Builder.expression.func.postfix(
      'is not null',
      Builder.expression.literal.integer(123)
    );
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('123 IS NOT NULL');
  });

  test('can mint a function call', () => {
    const node = Builder.expression.func.call('agg', [
      Builder.expression.literal.integer(1),
      Builder.expression.literal.integer(2),
      Builder.expression.literal.integer(3),
    ]);
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('AGG(1, 2, 3)');
  });
});

describe('source', () => {
  test('basic index', () => {
    const node = Builder.expression.source.node({ index: 'my_index', sourceType: 'index' });
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('my_index');
  });

  test('basic index using shortcut', () => {
    const node = Builder.expression.source.node('my_index');
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('my_index');
  });

  test('basic quoted index using shortcut', () => {
    const node = Builder.expression.source.node(Builder.expression.literal.string('my_index'));
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('"my_index"');
  });

  test('index with cluster', () => {
    const node = Builder.expression.source.node({
      index: 'my_index',
      sourceType: 'index',
      prefix: Builder.expression.literal.string('my_cluster', { unquoted: true }),
    });
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('my_cluster:my_index');
  });

  test('index with cluster - plain text cluster', () => {
    const node = Builder.expression.source.node({
      index: 'my_index',
      sourceType: 'index',
      prefix: 'my_cluster',
    });
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('my_cluster:my_index');
  });

  test('policy index', () => {
    const node = Builder.expression.source.node({ index: 'my_policy', sourceType: 'policy' });
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('my_policy');
  });

  describe('.index', () => {
    test('can use .source.index() shorthand to specify cluster', () => {
      const node = Builder.expression.source.index('my_index', 'my_cluster');
      const text = BasicPrettyPrinter.expression(node);

      expect(text).toBe('my_cluster:my_index');
    });

    test('can use .source.index() and specify quotes around cluster', () => {
      const node = Builder.expression.source.index(
        'my_index',
        Builder.expression.literal.string('hello 👋')
      );
      const text = BasicPrettyPrinter.expression(node);

      expect(text).toBe('"hello 👋":my_index');
    });

    test('can use .source.index() shorthand to specify selector', () => {
      const node = Builder.expression.source.index('my_index', '', 'my_selector');
      const text = BasicPrettyPrinter.expression(node);

      expect(text).toBe('my_index::my_selector');
    });
  });
});

describe('column', () => {
  test('a simple field', () => {
    const node = Builder.expression.column({ args: [Builder.identifier('my_field')] });
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('my_field');
  });

  test('a simple field using shorthand', () => {
    const node = Builder.expression.column('my_field');
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('my_field');
  });

  test('a nested field', () => {
    const node = Builder.expression.column({
      args: [Builder.identifier('locale'), Builder.identifier('region')],
    });
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('locale.region');
  });

  test('a nested field using shortcut', () => {
    const node = Builder.expression.column(['locale', 'region']);
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('locale.region');
  });

  test('a nested with params using shortcut', () => {
    const node = Builder.expression.column(['locale', '?param', 'region']);
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('locale.?param.region');
  });
});

describe('literal', () => {
  describe('"time interval"', () => {
    test('a basic time Interval node', () => {
      const node = Builder.expression.literal.qualifiedInteger(42, 'days');
      const text = BasicPrettyPrinter.expression(node);

      expect(text).toBe('42 days');
    });
  });

  describe('null', () => {
    test('can create a NULL node', () => {
      const node = Builder.expression.literal.nil();
      const text = BasicPrettyPrinter.expression(node);

      expect(text).toBe('NULL');
      expect(node).toMatchObject({
        type: 'literal',
        literalType: 'null',
      });
    });
  });

  describe('numeric', () => {
    test('integer shorthand', () => {
      const node = Builder.expression.literal.integer(42);

      expect(node).toMatchObject({
        type: 'literal',
        literalType: 'integer',
        name: '42',
        value: 42,
      });
    });

    test('decimal shorthand', () => {
      const node = Builder.expression.literal.decimal(3.14);

      expect(node).toMatchObject({
        type: 'literal',
        literalType: 'double',
        name: '3.14',
        value: 3.14,
      });
    });
  });

  describe('string', () => {
    test('can create a basic string', () => {
      const node = Builder.expression.literal.string('abc');
      const text = BasicPrettyPrinter.expression(node);

      expect(text).toBe('"abc"');
      expect(node).toMatchObject({
        type: 'literal',
        literalType: 'keyword',
        name: '"abc"',
        value: '"abc"',
        valueUnquoted: 'abc',
      });
    });
  });

  describe('boolean', () => {
    test('TRUE literal', () => {
      const node = Builder.expression.literal.boolean(true);
      const text = BasicPrettyPrinter.expression(node);

      expect(text).toBe('TRUE');
      expect(node).toMatchObject({
        type: 'literal',
        literalType: 'boolean',
        name: 'true',
        value: 'true',
      });
    });
  });

  describe('lists', () => {
    test('string list', () => {
      const node = Builder.expression.list.literal({
        values: [
          Builder.expression.literal.string('a'),
          Builder.expression.literal.string('b'),
          Builder.expression.literal.string('c'),
        ],
      });
      const text = BasicPrettyPrinter.expression(node);

      expect(text).toBe('["a", "b", "c"]');
    });

    test('integer list', () => {
      const node = Builder.expression.list.literal({
        values: [
          Builder.expression.literal.integer(1),
          Builder.expression.literal.integer(2),
          Builder.expression.literal.integer(3),
        ],
      });
      const text = BasicPrettyPrinter.expression(node);

      expect(text).toBe('[1, 2, 3]');
    });

    test('boolean list', () => {
      const node = Builder.expression.list.literal({
        values: [
          Builder.expression.literal.boolean(true),
          Builder.expression.literal.boolean(false),
        ],
      });
      const text = BasicPrettyPrinter.expression(node);

      expect(text).toBe('[TRUE, FALSE]');
    });
  });
});

describe('identifier', () => {
  test('a single identifier node', () => {
    const node = Builder.identifier('text');
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('text');
  });
});

describe('param', () => {
  test('unnamed', () => {
    const node = Builder.param.build('?');
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('?');
    expect(node).toMatchObject({
      type: 'literal',
      paramKind: '?',
      literalType: 'param',
      paramType: 'unnamed',
    });
  });

  test('unnamed (double)', () => {
    const node = Builder.param.build('??');
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('??');
    expect(node).toMatchObject({
      type: 'literal',
      paramKind: '??',
      literalType: 'param',
      paramType: 'unnamed',
    });
  });

  test('named', () => {
    const node = Builder.param.build('?the_name');
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('?the_name');
    expect(node).toMatchObject({
      type: 'literal',
      paramKind: '?',
      literalType: 'param',
      paramType: 'named',
      value: 'the_name',
    });
  });

  test('named (double)', () => {
    const node = Builder.param.build('??the_name');
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('??the_name');
    expect(node).toMatchObject({
      type: 'literal',
      paramKind: '??',
      literalType: 'param',
      paramType: 'named',
      value: 'the_name',
    });
  });

  test('positional', () => {
    const node = Builder.param.build('?123');
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('?123');
    expect(node).toMatchObject({
      type: 'literal',
      paramKind: '?',
      literalType: 'param',
      paramType: 'positional',
      value: 123,
    });
  });

  test('positional (double)', () => {
    const node = Builder.param.build('??123');
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('??123');
    expect(node).toMatchObject({
      type: 'literal',
      paramKind: '??',
      literalType: 'param',
      paramType: 'positional',
      value: 123,
    });
  });
});

describe('cast', () => {
  test('cast to integer', () => {
    const node = Builder.expression.inlineCast({
      value: Builder.expression.literal.decimal(123.45),
      castType: 'integer',
    });
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('123.45::INTEGER');
  });
});

describe('order', () => {
  test('field with no modifiers', () => {
    const node = Builder.expression.order(Builder.expression.column('my_field'), {
      nulls: '',
      order: '',
    });
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('my_field');
  });

  test('field with ASC and NULL FIRST modifiers', () => {
    const node = Builder.expression.order(Builder.expression.column(['a', 'b', 'c']), {
      nulls: 'NULLS FIRST',
      order: 'ASC',
    });
    const text = BasicPrettyPrinter.expression(node);

    expect(text).toBe('a.b.c ASC NULLS FIRST');
  });
});

describe('map', () => {
  test('can construct an empty map', () => {
    const node1 = Builder.expression.map();
    const node2 = Builder.expression.map({});
    const node3 = Builder.expression.map({
      entries: [],
    });

    expect(node1).toMatchObject({
      type: 'map',
      entries: [],
    });
    expect(node2).toMatchObject({
      type: 'map',
      entries: [],
    });
    expect(node3).toMatchObject({
      type: 'map',
      entries: [],
    });
  });

  test('can construct a map with two keys', () => {
    const node = Builder.expression.map({
      entries: [
        Builder.expression.entry('foo', Builder.expression.literal.integer(1)),
        Builder.expression.entry('bar', Builder.expression.literal.integer(2)),
      ],
    });

    expect(node).toMatchObject({
      type: 'map',
      entries: [
        {
          type: 'map-entry',
          key: {
            type: 'literal',
            literalType: 'keyword',
            valueUnquoted: 'foo',
          },
          value: {
            type: 'literal',
            literalType: 'integer',
            value: 1,
          },
        },
        {
          type: 'map-entry',
          key: {
            type: 'literal',
            literalType: 'keyword',
            valueUnquoted: 'bar',
          },
          value: {
            type: 'literal',
            literalType: 'integer',
            value: 2,
          },
        },
      ],
    });
  });
});
