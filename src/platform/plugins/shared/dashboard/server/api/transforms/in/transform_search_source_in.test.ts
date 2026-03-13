/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformSearchSourceIn } from './transform_search_source_in';

describe('transformSearchSourceIn', () => {
  test('should extract references from filters', () => {
    const { searchSourceJSON, references } = transformSearchSourceIn([
      {
        data_view_id: 'fizzle-1234',
        type: 'condition',
        condition: {
          operator: 'exists',
          field: 'foo',
        },
      },
    ]);
    expect(searchSourceJSON).toMatchInlineSnapshot(
      `"{\\"filter\\":[{\\"meta\\":{\\"key\\":\\"foo\\",\\"field\\":\\"foo\\",\\"type\\":\\"exists\\",\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index\\"},\\"query\\":{\\"exists\\":{\\"field\\":\\"foo\\"}}}]}"`
    );
    expect(references).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "fizzle-1234",
          "name": "kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index",
          "type": "index-pattern",
        },
      ]
    `);
  });
});
