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

describe('.pipe()', () => {
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
