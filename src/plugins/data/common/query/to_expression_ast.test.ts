/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { queryStateToExpressionAst } from './to_expression_ast';

describe('queryStateToExpressionAst', () => {
  it('returns an object with the correct structure', async () => {
    const dataViewsService = {} as unknown as DataViewsContract;
    const actual = await queryStateToExpressionAst({
      filters: [],
      query: { language: 'lucene', query: '' },
      time: {
        from: 'now',
        to: 'now+7d',
      },
      dataViewsService,
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
    const dataViewsService = {
      getIdsWithTitle: jest.fn(() => {
        return [
          {
            title: 'foo',
            id: 'bar',
          },
        ];
      }),
      get: jest.fn(() => {
        return {
          title: 'foo',
          id: 'bar',
          timeFieldName: 'baz',
        };
      }),
    } as unknown as DataViewsContract;
    const actual = await queryStateToExpressionAst({
      filters: [],
      query: { sql: 'SELECT * FROM foo' },
      time: {
        from: 'now',
        to: 'now+7d',
      },
      dataViewsService,
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
        query: ['SELECT * FROM foo'],
      })
    );
  });
});
