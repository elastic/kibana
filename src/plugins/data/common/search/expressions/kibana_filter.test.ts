/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMockContext } from '@kbn/expressions-plugin/common';
import { functionWrapper } from './utils';
import { kibanaFilterFunction } from './kibana_filter';

describe('interpreter/functions#kibanaFilter', () => {
  const fn = functionWrapper(kibanaFilterFunction);

  it('returns an object with the correct structure', () => {
    const actual = fn(null, { query: '{ "name": "test" }' }, createMockContext());
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "meta": Object {
          "alias": "",
          "disabled": false,
          "negate": false,
        },
        "query": Object {
          "name": "test",
        },
        "type": "kibana_filter",
      }
    `);
  });
});
