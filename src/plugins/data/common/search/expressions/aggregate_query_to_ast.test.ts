/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { aggregateQueryToAst } from './aggregate_query_to_ast';

describe('aggregateQueryToAst', () => {
  it('should return a function', () => {
    expect(aggregateQueryToAst({ sql: 'SELECT * from foo' })).toHaveProperty('type', 'function');
  });

  it('should forward arguments', () => {
    expect(aggregateQueryToAst({ sql: 'SELECT * from foo' }, 'baz')).toHaveProperty(
      'arguments',
      expect.objectContaining({
        query: ['SELECT * from foo'],
        timeField: ['baz'],
      })
    );
  });
});
