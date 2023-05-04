/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createStubDataView } from '@kbn/data-views-plugin/common/mocks';
import { textBasedQueryStateToAstWithValidation } from './text_based_query_state_to_ast_with_validation';

describe('textBasedQueryStateToAstWithValidation', () => {
  it('returns undefined for a non text based query', async () => {
    const actual = await textBasedQueryStateToAstWithValidation({
      filters: [],
      query: { language: 'lucene', query: '' },
      time: {
        from: 'now',
        to: 'now+7d',
      },
    });

    expect(actual).toBeUndefined();
  });

  it('returns an object with the correct structure for an SQL query with existing dataview', async () => {
    const dataView = createStubDataView({
      spec: {
        id: 'foo',
        title: 'foo',
        timeFieldName: '@timestamp',
      },
    });
    const actual = await textBasedQueryStateToAstWithValidation({
      filters: [],
      query: { sql: 'SELECT * FROM foo' },
      time: {
        from: 'now',
        to: 'now+7d',
      },
      dataView,
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

  it('returns an object with the correct structure for text based language with non existing dataview', async () => {
    const actual = await textBasedQueryStateToAstWithValidation({
      filters: [],
      query: { sql: 'SELECT * FROM index_pattern_with_no_data_view' },
      time: {
        from: 'now',
        to: 'now+7d',
      },
    });
    expect(actual).toHaveProperty(
      'chain.2.arguments',
      expect.objectContaining({
        query: ['SELECT * FROM index_pattern_with_no_data_view'],
      })
    );
  });
});
