/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '../esql';

test('prints the query object when casting to string', () => {
  const query = esql`FROM kibana_ecommerce_index | WHERE foo > 42 AND bar < 24 | EVAL a = 123 | LIMIT 10`;

  expect('\n' + query).toBe(`
ComposerQuery
├─ query
│  └─ FROM kibana_ecommerce_index
│       | WHERE foo > 42 AND bar < 24
│       | EVAL a = 123
│       | LIMIT 10
│
└─ params
   └─ {}`);
});

describe('.pipe``', () => {
  test('can add additional commands to the query', () => {
    const query = esql`FROM kibana_ecommerce_index`;

    expect(query.print('basic')).toBe('FROM kibana_ecommerce_index');

    query.pipe`WHERE foo > 42`.pipe`EVAL a = 123`;

    expect(query.print('basic')).toBe(
      'FROM kibana_ecommerce_index | WHERE foo > 42 | EVAL a = 123'
    );

    query.pipe`LIMIT 10`;

    expect(query.print('basic')).toBe(
      'FROM kibana_ecommerce_index | WHERE foo > 42 | EVAL a = 123 | LIMIT 10'
    );
  });

  test('can supply integers floats into holes', () => {
    const query = esql`FROM kibana_ecommerce_index`;

    expect(query.print('basic')).toBe('FROM kibana_ecommerce_index');

    query.pipe`WHERE foo > ${5.5}`.pipe`EVAL a = ${123}`;

    expect(query.print('basic')).toBe(
      'FROM kibana_ecommerce_index | WHERE foo > 5.5 | EVAL a = 123'
    );
  });

  test('can insert parameters', () => {
    const query = esql`FROM kibana_ecommerce_index`;

    query.pipe`WHERE foo > ${esql.par(5.5)}`.pipe`EVAL a = ${esql.par(123)}`;

    expect(query.toRequest()).toEqual({
      query: 'FROM kibana_ecommerce_index | WHERE foo > ?p0 | EVAL a = ?p1',
      params: [{ p0: 5.5 }, { p1: 123 }],
    });
  });

  test('throws when providing multiple commands in one template', () => {
    const query = esql`FROM kibana_ecommerce_index`;

    expect(() => query.pipe`WHERE foo > 123 | LIMIT 10`).toThrowErrorMatchingInlineSnapshot(
      `"Could not parse a single command completely: \\"WHERE foo > 123 | LIMIT 10\\". "`
    );
  });

  test('can generate commands using a string `.pipe(str)`', () => {
    const query = esql`FROM kibana_ecommerce_index`;

    expect(query.print('basic')).toBe('FROM kibana_ecommerce_index');

    query.pipe('WHERE foo > 42').pipe('EVAL a = 123');

    expect(query.print('basic')).toBe(
      'FROM kibana_ecommerce_index | WHERE foo > 42 | EVAL a = 123'
    );
  });
});

describe('high-level helpers', () => {
  describe('.limit()', () => {
    test('appends command to the end', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index');

      query.limit(10);

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index | LIMIT 10');

      query.limit(1).limit(2);

      expect(query.print('basic')).toBe(
        'FROM kibana_ecommerce_index | LIMIT 10 | LIMIT 1 | LIMIT 2'
      );
    });
  });

  describe('.keep()', () => {
    test('appends command to the end', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index');

      query.keep('foo', 'bar', 'my-column');

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index | KEEP foo, bar, `my-column`');
    });

    test('can specify nested columns', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      query.keep(['user', 'name'], ['user', 'age']);

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index | KEEP user.name, user.age');
    });

    test('escapes special characters', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      query.keep(['usér', 'name'], ['user', '❤️']);

      expect(query.print('basic')).toBe(
        'FROM kibana_ecommerce_index | KEEP `usér`.name, user.`❤️`'
      );
    });

    test('throws on empty list', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      expect(() => {
        // @ts-expect-error - TypeScript types do not allow empty .keep() call
        query.keep();
      }).toThrow();
    });
  });
});

describe('.toRequest()', () => {
  test('can return query as "request" object', () => {
    const query = esql`
      FROM kibana_ecommerce_index
      | WHERE foo > 42 AND bar < 24
      | EVAL a = 123
      | LIMIT 10`;

    expect(query.toRequest()).toMatchObject({
      query: 'FROM kibana_ecommerce_index | WHERE foo > 42 AND bar < 24 | EVAL a = 123 | LIMIT 10',
      params: [],
    });
  });
});
