/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedVis } from '../types';
import { extractVisReferences } from './extract_vis_references';

describe('extractVisReferences', () => {
  test('should extract data view reference', () => {
    expect(
      extractVisReferences({
        data: {
          searchSource: {
            index: '1234',
          },
        },
      } as SerializedVis)
    ).toMatchInlineSnapshot(`
      Object {
        "references": Array [
          Object {
            "id": "1234",
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
          },
        ],
        "savedVis": Object {
          "data": Object {
            "searchSource": Object {
              "index": undefined,
              "indexRefName": "kibanaSavedObjectMeta.searchSourceJSON.index",
            },
          },
        },
      }
    `);
  });

  test('should extract discover session reference', () => {
    expect(
      extractVisReferences({
        data: {
          savedSearchId: 'abcd',
        },
      } as SerializedVis)
    ).toMatchInlineSnapshot(`
      Object {
        "references": Array [
          Object {
            "id": "abcd",
            "name": "search_0",
            "type": "search",
          },
        ],
        "savedVis": Object {
          "data": Object {
            "savedSearchRefName": "search_0",
            "searchSource": undefined,
          },
        },
      }
    `);
  });
});
