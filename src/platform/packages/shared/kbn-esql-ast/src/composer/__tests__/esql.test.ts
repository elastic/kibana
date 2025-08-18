/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../../builder';
import type { ESQLLiteral } from '../../types';
import { ComposerQuery } from '../composer_query';
import { esql, e } from '../esql';

describe('"esql" tag query construction', () => {
  test('can construct a static query', () => {
    const query = esql`FROM index | WHERE foo > 42 | LIMIT 10`;

    expect(query).toBeInstanceOf(ComposerQuery);
    expect(query.print()).toBe('FROM index | WHERE foo > 42 | LIMIT 10');
    expect(query.ast).toMatchObject({
      type: 'query',
      commands: [{ name: 'from' }, { name: 'where' }, { name: 'limit' }],
    });
  });

  test('throws on invalid query', () => {
    expect(() => esql`FROM index | WHERE foo > | LIMIT 10`).toThrow();
  });

  test('can construct a query with a simple dynamic input', () => {
    const input = 42;
    const query = esql`FROM index | WHERE foo > ${input} | LIMIT 10`;

    expect(query).toBeInstanceOf(ComposerQuery);
    expect(query.print()).toBe('FROM index | WHERE foo > 42 | LIMIT 10');
    expect(query.ast).toMatchObject({
      type: 'query',
      commands: [{ name: 'from' }, { name: 'where' }, { name: 'limit' }],
    });
  });

  test('can construct a query from string', () => {
    const input = 42;
    const query = esql(`FROM index | WHERE foo > ${input} | LIMIT 10`);

    expect(query).toBeInstanceOf(ComposerQuery);
    expect(query.print()).toBe('FROM index | WHERE foo > 42 | LIMIT 10');
    expect(query.ast).toMatchObject({
      type: 'query',
      commands: [{ name: 'from' }, { name: 'where' }, { name: 'limit' }],
    });
  });
});

describe('processing holes', () => {
  test('various hole input construction methods result into equivalent query', () => {
    const input = 42;
    // prettier-ignore
    const query1 = esql`FROM index | WHERE foo > ${{type: 'literal', literalType: 'integer', value: input} as ESQLLiteral} | LIMIT 10`;
    // prettier-ignore
    const query2 = esql`FROM index | WHERE foo > ${Builder.expression.literal.integer(input)} | LIMIT 10`;
    const query3 = esql`FROM index | WHERE foo > ${esql.int(input)} | LIMIT 10`;
    const query4 = esql`FROM index | WHERE foo > ${input} | LIMIT 10`;

    expect(query1 + '').toBe(query2 + '');
    expect(query1 + '').toBe(query3 + '');
    expect(query1 + '').toBe(query4 + '');
  });

  test('can construct a query with dynamic input enforced to be a string', () => {
    const input = 'test';
    const query = esql`FROM index | WHERE foo > ${e.str(input)} | LIMIT 10`;

    expect(query).toBeInstanceOf(ComposerQuery);
    expect(query.print()).toBe('FROM index | WHERE foo > "test" | LIMIT 10');
    expect(query.ast).toMatchObject({
      type: 'query',
      commands: [{ name: 'from' }, { name: 'where' }, { name: 'limit' }],
    });
  });

  test.todo('repeated param with the same name, re-use if the same value');
  test.todo('repeated param with the same name, increments integer to the end of the name');
});

describe('params', () => {
  test('can add a parameter', () => {
    const input = 'test';
    const query = esql`FROM index | WHERE foo > ${e.par(input)} | LIMIT 10`;

    expect(query).toBeInstanceOf(ComposerQuery);
    expect(query.print()).toBe('FROM index | WHERE foo > ?p0 | LIMIT 10');

    expect('\n' + query).toBe(`
ComposerQuery
├─ query
│  └─ FROM index | WHERE foo > ?p0 | LIMIT 10
│
└─ params
   └─ p0: "test"`);

    expect(query.toRequest()).toEqual({
      query: 'FROM index | WHERE foo > ?p0 | LIMIT 10',
      params: [{ p0: 'test' }],
    });
  });

  test('can specify custom param name', () => {
    const input = 'test';
    const query = esql`FROM index | WHERE foo > ${e.par(input, 'custom_param')} | LIMIT 10`;

    expect(query).toBeInstanceOf(ComposerQuery);
    expect(query.print()).toBe('FROM index | WHERE foo > ?custom_param | LIMIT 10');

    expect('\n' + query).toBe(`
ComposerQuery
├─ query
│  └─ FROM index | WHERE foo > ?custom_param | LIMIT 10
│
└─ params
   └─ custom_param: "test"`);

    expect(query.toRequest()).toEqual({
      query: 'FROM index | WHERE foo > ?custom_param | LIMIT 10',
      params: [{ custom_param: 'test' }],
    });
  });

  test('can specify two params, first named', () => {
    const query = esql`FROM index | LIMIT ${e.par(10, 'limit_param')} | LIMIT ${e.par(25)}`;

    expect(query).toBeInstanceOf(ComposerQuery);
    expect(query.print()).toBe('FROM index | LIMIT ?limit_param | LIMIT ?p1');

    expect('\n' + query).toBe(`
ComposerQuery
├─ query
│  └─ FROM index | LIMIT ?limit_param | LIMIT ?p1
│
└─ params
   ├─ limit_param: 10
   └─ p1: 25`);

    expect(query.toRequest()).toEqual({
      query: 'FROM index | LIMIT ?limit_param | LIMIT ?p1',
      params: [{ limit_param: 10 }, { p1: 25 }],
    });
  });

  test('throws on unnamed parameter', () => {
    const input = 'test';
    expect(
      () => esql`FROM index | WHERE foo > ${e.par(input, '')} | LIMIT 10`
    ).toThrowErrorMatchingInlineSnapshot(`"Unnamed parameters are not allowed"`);
  });

  test('throws on positional parameter', () => {
    const input = 'test';
    expect(
      () => esql`FROM index | WHERE foo > ${e.par(input, '123')} | LIMIT 10`
    ).toThrowErrorMatchingInlineSnapshot(
      `"Invalid parameter name \\"123\\". Parameter names cannot start with a digit or space."`
    );
  });

  test('can specify params using shorthand object syntax', () => {
    const limit = 123;
    const field = 'test_field';
    const query = esql`FROM index | LIMIT ${{ limit }} | KEEP ${{ field }}`;

    expect(query).toBeInstanceOf(ComposerQuery);
    expect(query.print()).toBe('FROM index | LIMIT ?limit | KEEP ?field');

    expect('\n' + query).toBe(`
ComposerQuery
├─ query
│  └─ FROM index | LIMIT ?limit | KEEP ?field
│
└─ params
   ├─ limit: 123
   └─ field: "test_field"`);

    expect(query.toRequest()).toEqual({
      query: 'FROM index | LIMIT ?limit | KEEP ?field',
      params: [{ limit: 123 }, { field: 'test_field' }],
    });
  });

  test('shorthand syntax renames second parameter, if it is already used', () => {
    const limit = 123;
    const limit2 = 456;
    const query = esql`FROM index | LIMIT ${{ limit }} | LIMIT ${{ limit: limit2 }}`;

    expect(query).toBeInstanceOf(ComposerQuery);
    expect(query.print()).toBe('FROM index | LIMIT ?limit | LIMIT ?p1');

    expect('\n' + query).toBe(`
ComposerQuery
├─ query
│  └─ FROM index | LIMIT ?limit | LIMIT ?p1
│
└─ params
   ├─ limit: 123
   └─ p1: 456`);

    expect(query.toRequest()).toEqual({
      query: 'FROM index | LIMIT ?limit | LIMIT ?p1',
      params: [{ limit: 123 }, { p1: 456 }],
    });
  });

  test('throws on invalid shorthand syntax', () => {
    const limit = 123;

    expect(() => {
      esql`FROM index | LIMIT ${
        // @ts-expect-error - Parameter shorthand must be an object with a single key
        { limit, noMoreFields: true }
      }`;
    }).toThrowErrorMatchingInlineSnapshot(
      `"Unexpected synth hole: {\\"limit\\":123,\\"noMoreFields\\":true}"`
    );
  });
});
