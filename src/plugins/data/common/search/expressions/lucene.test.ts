/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExecutionContext } from '@kbn/expressions-plugin/common';
import { ExpressionValueSearchContext } from './kibana_context_type';
import { functionWrapper } from './utils';
import { luceneFunction } from './lucene';

describe('interpreter/functions#lucene', () => {
  const fn = functionWrapper(luceneFunction);
  let input: Partial<ExpressionValueSearchContext>;
  let context: ExecutionContext;

  beforeEach(() => {
    input = { timeRange: { from: '0', to: '1' } };
    context = {
      getSearchContext: () => ({}),
      getSearchSessionId: () => undefined,
      getExecutionContext: () => undefined,
      types: {},
      variables: {},
      abortSignal: {} as any,
      inspectorAdapters: {} as any,
    };
  });

  it('returns an object with the correct structure', () => {
    const actual = fn(input, { q: '{ "test": 1 }' }, context);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "language": "lucene",
        "query": Object {
          "test": 1,
        },
        "type": "kibana_query",
      }
    `);
  });
});
