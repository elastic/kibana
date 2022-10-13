/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExecutionContext } from '@kbn/expressions-plugin/common';
import { kibana } from './kibana';
import { ExpressionValueSearchContext } from './kibana_context_type';
import { functionWrapper } from './utils';

describe('interpreter/functions#kibana', () => {
  const fn = functionWrapper(kibana);
  let input: Partial<ExpressionValueSearchContext>;
  let search: ExpressionValueSearchContext;
  let context: ExecutionContext;

  beforeEach(() => {
    input = { timeRange: { from: '0', to: '1' } };
    search = {
      type: 'kibana_context',
      query: { language: 'lucene', query: 'geo.src:US' },
      filters: [
        {
          meta: {
            disabled: false,
            negate: false,
            alias: null,
          },
          query: { match: {} },
        },
      ],
      timeRange: { from: '2', to: '3' },
    };
    context = {
      getSearchContext: () => search,
      getSearchSessionId: () => undefined,
      getExecutionContext: () => undefined,
      types: {},
      variables: {},
      abortSignal: {} as any,
      inspectorAdapters: {} as any,
    };
  });

  it('returns an object with the correct structure', () => {
    const actual = fn(input, {}, context);
    expect(actual).toMatchSnapshot();
  });

  it('uses timeRange from input if not provided in search context', () => {
    search.timeRange = undefined;
    const actual = fn(input, {}, context);
    expect(actual.timeRange).toEqual({ from: '0', to: '1' });
  });

  it('combines filters from input with search context', () => {
    input.filters = [
      {
        meta: {
          disabled: true,
          negate: false,
          alias: null,
        },
        query: { match: {} },
      },
    ];
    const actual = fn(input, {}, context);
    expect(actual.filters).toEqual([
      {
        meta: {
          disabled: false,
          negate: false,
          alias: null,
        },
        query: { match: {} },
      },
      {
        meta: {
          disabled: true,
          negate: false,
          alias: null,
        },
        query: { match: {} },
      },
    ]);
  });
});
