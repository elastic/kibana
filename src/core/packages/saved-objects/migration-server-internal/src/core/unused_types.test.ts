/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildExcludeUnusedTypesQuery } from './unused_types';

describe('buildExcludeUnusedTypesQuery', () => {
  it('should build the correct query with some excluded types', () => {
    const query = buildExcludeUnusedTypesQuery(['exclude-type', 'exclude_type', 'excludeType']);
    expect(query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "must_not": Array [
            Object {
              "term": Object {
                "type": "exclude-type",
              },
            },
            Object {
              "term": Object {
                "type": "exclude_type",
              },
            },
            Object {
              "term": Object {
                "type": "excludeType",
              },
            },
          ],
        },
      }
    `);
  });
});
