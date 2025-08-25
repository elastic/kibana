/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ComposerQuery } from '../composer_query';
import { esql } from '../esql';

describe('various dynamic query construction scenarios', () => {
  test('can inline a primitive runtime value', () => {
    const field = 'foo';
    const value = 42;
    const query = esql`FROM index | WHERE ${[field]} > ${value} | LIMIT 10`;

    // console.log(query + '');
    expect(query).toBeInstanceOf(ComposerQuery);
    expect(query.print()).toBe('FROM index | WHERE foo > 42 | LIMIT 10');
    expect(query.ast).toMatchObject({
      type: 'query',
      commands: [{ name: 'from' }, { name: 'where' }, { name: 'limit' }],
    });
    expect(query.toRequest().params).toEqual([]);
  });

  test('can inline a list sources', () => {
    const indices = ['index1', 'index2'];
    const nodes = indices.map((index) => esql.src(index));
    const query = esql`FROM ${nodes} | LIMIT 10`;

    expect(query.print('basic')).toBe('FROM index1, index2 | LIMIT 10');
  });

  test('can inline inline binary expression chain', () => {
    const conditions: [string[], number][] = [
      [['foo'], 42],
      [['bar', 'baz'], 24],
    ];
    let where = esql.exp`TRUE`;

    for (const [field, value] of conditions) {
      where = esql.exp`${where} AND ${field} > ${value}`;
    }
    // console.log(where + '');

    const query = esql`FROM index | WHERE ${where} | LIMIT 10`;
    // console.log(query + '');

    expect(query.print()).toBe('FROM index | WHERE TRUE AND foo > 42 AND bar.baz > 24 | LIMIT 10');
  });

  test('can inline inline a string value', () => {
    const field = ['first', 'name'];
    const name = 'John';
    const query = esql`FROM index | WHERE ${field} == ${name}`;

    expect(query.print()).toBe('FROM index | WHERE `first`.name == "John"');
  });
});
