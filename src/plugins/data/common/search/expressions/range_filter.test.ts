/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExecutionContext } from 'src/plugins/expressions/common';
import { functionWrapper } from './utils';
import { rangeFilterFunction } from './range_filter';

describe('interpreter/functions#rangeFilter', () => {
  const fn = functionWrapper(rangeFilterFunction);
  let context: ExecutionContext;

  beforeEach(() => {
    context = {
      getSearchContext: () => ({}),
      getSearchSessionId: () => undefined,
      types: {},
      variables: {},
      abortSignal: {} as any,
      inspectorAdapters: {} as any,
    };
  });

  it('returns an object with the correct structure', () => {
    const actual = fn(
      null,
      { field: { spec: { name: 'test' } }, range: { gt: 10, lt: 20 } },
      context
    );
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "meta": Object {
          "alias": null,
          "disabled": false,
          "index": undefined,
          "negate": false,
          "params": Object {},
        },
        "range": Object {
          "test": Object {
            "gte": 10,
            "lt": 20,
          },
        },
        "type": "kibana_filter",
      }
    `);
  });
});
