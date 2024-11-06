/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { textBasedQueryStateToExpressionAst } from './text_based_query_state_to_ast';

describe('textBasedQueryStateToExpressionAst', () => {
  it('returns an object with the correct structure', async () => {
    const actual = await textBasedQueryStateToExpressionAst({
      filters: [],
      query: { language: 'lucene', query: '' },
      time: {
        from: 'now',
        to: 'now+7d',
      },
    });

    expect(actual).toHaveProperty(
      'chain.1.arguments.timeRange.0.chain.0.arguments',
      expect.objectContaining({
        from: ['now'],
        to: ['now+7d'],
      })
    );

    expect(actual).toHaveProperty('chain.1.arguments.filters', expect.arrayContaining([]));
  });

  it('returns an object with the correct structure for an SQL query', async () => {
    const actual = await textBasedQueryStateToExpressionAst({
      filters: [],
      query: { esql: 'FROM foo' },
      time: {
        from: 'now',
        to: 'now+7d',
      },
    });

    expect(actual).toHaveProperty(
      'chain.1.arguments.timeRange.0.chain.0.arguments',
      expect.objectContaining({
        from: ['now'],
        to: ['now+7d'],
      })
    );

    expect(actual).toHaveProperty(
      'chain.2.arguments',
      expect.objectContaining({
        query: ['FROM foo'],
      })
    );
  });

  it('returns an object with the correct structure for an ES|QL query', async () => {
    const actual = await textBasedQueryStateToExpressionAst({
      filters: [],
      query: { esql: 'FROM foo' },
      time: {
        from: 'now',
        to: 'now+7d',
      },
    });

    expect(actual).toHaveProperty(
      'chain.1.arguments.timeRange.0.chain.0.arguments',
      expect.objectContaining({
        from: ['now'],
        to: ['now+7d'],
      })
    );

    expect(actual).toHaveProperty(
      'chain.2.arguments',
      expect.objectContaining({
        query: ['FROM foo'],
      })
    );
  });
});
