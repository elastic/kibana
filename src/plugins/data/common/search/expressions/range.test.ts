/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExecutionContext } from '@kbn/expressions-plugin/common';
import { functionWrapper } from './utils';
import { rangeFunction } from './range';

describe('interpreter/functions#range', () => {
  const fn = functionWrapper(rangeFunction);
  let context: ExecutionContext;

  beforeEach(() => {
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
    const actual = fn(null, { lt: 20, gt: 10 }, context);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "gt": 10,
        "gte": undefined,
        "lt": 20,
        "lte": undefined,
        "type": "kibana_range",
      }
    `);
  });
});
