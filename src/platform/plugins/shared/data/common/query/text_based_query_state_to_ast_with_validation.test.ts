/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
    const actual = await textBasedQueryStateToAstWithValidation({
      filters: [],
      query: { esql: 'FROM foo' },
      time: {
        from: 'now',
        to: 'now+7d',
      },
      timeFieldName: '@timestamp',
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

  it('returns an object with the correct structure for text based language with non existing dataview', async () => {
    const actual = await textBasedQueryStateToAstWithValidation({
      filters: [],
      query: { esql: 'FROM index_pattern_with_no_data_view' },
      time: {
        from: 'now',
        to: 'now+7d',
      },
    });
    expect(actual).toHaveProperty(
      'chain.2.arguments',
      expect.objectContaining({
        query: ['FROM index_pattern_with_no_data_view'],
      })
    );
  });

  it('returns an object with the correct structure for ES|QL', async () => {
    const actual = await textBasedQueryStateToAstWithValidation({
      filters: [],
      query: { esql: 'from logs*' },
      time: {
        from: 'now',
        to: 'now+7d',
      },
      timeFieldName: '@timestamp',
      titleForInspector: 'Custom title',
      descriptionForInspector: 'Custom desc',
    });
    expect(actual).toHaveProperty(
      'chain.2.arguments',
      expect.objectContaining({
        query: ['from logs*'],
        timeField: ['@timestamp'],
        locale: ['en'],
        titleForInspector: ['Custom title'],
        descriptionForInspector: ['Custom desc'],
      })
    );
  });
});
