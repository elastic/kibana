/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMockContext } from '@kbn/expressions-plugin/common';
import { functionWrapper } from './utils';
import { existsFilterFunction } from './exists_filter';

describe('interpreter/functions#existsFilter', () => {
  const fn = functionWrapper(existsFilterFunction);

  it('returns an object with the correct structure', () => {
    const actual = fn(null, { field: { spec: { name: 'test' } } }, createMockContext());
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "meta": Object {
          "alias": null,
          "disabled": false,
          "index": undefined,
          "negate": false,
        },
        "query": Object {
          "exists": Object {
            "field": "test",
          },
        },
        "type": "kibana_filter",
      }
    `);
  });
});
