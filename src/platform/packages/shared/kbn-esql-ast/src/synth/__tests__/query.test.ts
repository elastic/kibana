/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../../builder';
import { BasicPrettyPrinter } from '../../pretty_print';
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
