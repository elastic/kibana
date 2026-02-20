/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth } from '../../../..';
import { Builder } from '../../../ast/builder';
import { BasicPrettyPrinter } from '../../../pretty_print';
import { query } from '../query';

test('can create a WHERE command', () => {
  const node = query`FROM index | WHERE coordinates.lat >= 12.123123`;
  const text = BasicPrettyPrinter.print(node);

  expect(text).toBe('FROM index | WHERE coordinates.lat >= 12.123123');
});

test('throws on invalid query', () => {
  expect(() => query`FROM index |`).toThrow();
});

test('can build a composer query', () => {
  const node = query`FROM logs-*
    | WHERE @timestamp >= NOW() - 1 hour
    | SORT @timestamp DESC
    | KEEP service.name, log.level
    | LIMIT 10`;
  const text = BasicPrettyPrinter.print(node);

  expect(text).toBe(
    'FROM logs-* | WHERE @timestamp >= NOW() - 1 hour | SORT @timestamp DESC | KEEP service.name, log.level | LIMIT 10'
  );
});

test('can insert an integer node', () => {
  const param = 123;
  const node1 = Builder.expression.literal.integer(param);
  const query1 = query`FROM index | WHERE coordinates.lat >= ${node1}`;
  const query2 = query`FROM index | WHERE coordinates.lat >= ${param}`;

  expect(query1 + '').toBe('FROM index | WHERE coordinates.lat >= 123');
  expect(query2 + '').toBe('FROM index | WHERE coordinates.lat >= 123');
});

test('can insert a float node', () => {
  const param = 0.1;
  const node1 = Builder.expression.literal.decimal(param);
  const query1 = query`FROM index | WHERE coordinates.lat >= ${node1}`;
  const query2 = query`FROM index | WHERE coordinates.lat >= ${param}`;

  expect(query1 + '').toBe('FROM index | WHERE coordinates.lat >= 0.1');
  expect(query2 + '').toBe('FROM index | WHERE coordinates.lat >= 0.1');
});

test('can construct a FORK sub-query', () => {
  const query1 = query`/* asdf */ WHERE emp_no == 10001 | LIMIT 10`;
  const query2 = query`
    FROM employees
    | FORK
      ( ${query1} )
      ( WHERE emp_no == 10002 )
    | KEEP emp_no, _fork
    | SORT emp_no`;

  expect(query1 + '').toBe('/* asdf */ WHERE emp_no == 10001 | LIMIT 10');
  expect(query2 + '').toBe(
    'FROM employees | FORK (/* asdf */ WHERE emp_no == 10001 | LIMIT 10) (WHERE emp_no == 10002) | KEEP emp_no, _fork | SORT emp_no'
  );
});

test('can create a query without a source command', () => {
  const query1 = query`/* asdf */ WHERE emp_no == 10001`;
  const query2 = query`
    FORK
      ( ${query1} )
      ( WHERE emp_no == 10002 )
    | KEEP emp_no, _fork
    | SORT emp_no`;

  expect(query1 + '').toBe('/* asdf */ WHERE emp_no == 10001');
  expect(query2 + '').toBe(
    'FORK (/* asdf */ WHERE emp_no == 10001) (WHERE emp_no == 10002) | KEEP emp_no, _fork | SORT emp_no'
  );
});

describe('queries with header commands', () => {
  test('can create a query with a single SET header command', () => {
    const node = query`SET param = "value"; FROM index | WHERE field == ?param`;
    const text = BasicPrettyPrinter.print(node);

    expect(text).toBe('SET param = "value"; FROM index | WHERE field == ?param');
    expect(node.header).toBeDefined();
    expect(node.header).toHaveLength(1);
    expect(node.header![0].name).toBe('set');
  });

  test('can create a query with multiple SET header commands', () => {
    const node = query`SET a = "foo"; SET b = 123; SET c = TRUE; FROM index | WHERE x == ?a`;
    const text = BasicPrettyPrinter.print(node);

    expect(text).toBe('SET a = "foo"; SET b = 123; SET c = TRUE; FROM index | WHERE x == ?a');
    expect(node.header).toBeDefined();
    expect(node.header).toHaveLength(3);
    expect(node.header![0].name).toBe('set');
    expect(node.header![1].name).toBe('set');
    expect(node.header![2].name).toBe('set');
  });

  test('can create a query with header commands and ROW source', () => {
    const node = query`SET x = 10; ROW a = 1, b = 2`;
    const text = BasicPrettyPrinter.print(node);

    expect(text).toBe('SET x = 10; ROW a = 1, b = 2');
    expect(node.header).toBeDefined();
    expect(node.header).toHaveLength(1);
    expect(node.commands).toHaveLength(1);
    expect(node.commands[0].name).toBe('row');
  });

  test('can create a query with header commands and multiple pipes', () => {
    const node = query`SET a = 100; FROM logs | WHERE level == "error" | LIMIT ?limit`;
    const text = BasicPrettyPrinter.print(node);

    expect(text).toBe('SET a = 100; FROM logs | WHERE level == "error" | LIMIT ?limit');
    expect(node.header).toBeDefined();
    expect(node.header).toHaveLength(1);
    expect(node.commands).toHaveLength(3);
  });

  test('throws on queries starting with SET but no source command', () => {
    expect(() => query`SET x = 1; WHERE field == 10`).toThrow();
  });

  test('can insert header instruction value via template literal', () => {
    const param = 'myvalue';
    const node = query`SET x = ${param}; FROM index | WHERE field == ?x`;
    const text = BasicPrettyPrinter.print(node);

    expect(text).toBe('SET x = "myvalue"; FROM index | WHERE field == ?x');
  });

  test('can insert header SET instruction key', () => {
    const param = 'myvalue';
    const key = 'x';
    const node = query`SET ${synth.kwd(key)} = ${param}; FROM index | WHERE field == 123`;
    const text = BasicPrettyPrinter.print(node);

    expect(text).toBe('SET x = "myvalue"; FROM index | WHERE field == 123');
  });
});
