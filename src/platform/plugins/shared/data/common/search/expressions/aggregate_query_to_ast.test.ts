/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateQueryToAst } from './aggregate_query_to_ast';

describe('aggregateQueryToAst', () => {
  it('should return a function', () => {
    expect(aggregateQueryToAst({ query: { esql: 'from foo' } })).toHaveProperty('type', 'function');
  });

  it('should forward arguments', () => {
    expect(
      aggregateQueryToAst({
        query: { esql: 'from foo' },
        timeField: 'baz',
      })
    ).toHaveProperty(
      'arguments',
      expect.objectContaining({
        query: ['from foo'],
        timeField: ['baz'],
      })
    );

    expect(
      aggregateQueryToAst({
        query: { esql: 'from foo' },
        timeField: 'baz',
        titleForInspector: 'Custom title',
        descriptionForInspector: 'Custom desc',
      })
    ).toHaveProperty(
      'arguments',
      expect.objectContaining({
        query: ['from foo'],
        timeField: ['baz'],
        titleForInspector: ['Custom title'],
        descriptionForInspector: ['Custom desc'],
      })
    );
  });
});
