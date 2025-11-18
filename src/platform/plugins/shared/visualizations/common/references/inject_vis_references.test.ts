/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoredVis } from '../embeddable/transforms/types';
import { injectVisReferences } from './inject_vis_references';

describe('injectVisReferences', () => {
  test('injects data view reference', () => {
    const savedVis = injectVisReferences(
      {
        data: {
          searchSource: {
            indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          },
        },
      } as StoredVis,
      [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', id: '123', type: 'index-pattern' }]
    );
    expect(savedVis.data.searchSource).toMatchInlineSnapshot(`
      Object {
        "index": "123",
      }
    `);
  });

  test('injects data view reference even if it is already injected', () => {
    const savedVis = injectVisReferences(
      {
        data: {
          searchSource: {
            index: '456',
          },
        },
      } as StoredVis,
      [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', id: '123', type: 'index-pattern' }]
    );
    expect(savedVis.data.searchSource).toMatchInlineSnapshot(`
      Object {
        "index": "123",
      }
    `);
  });

  test('injects discover session reference', () => {
    const savedVis = injectVisReferences(
      {
        data: {
          searchSource: {},
        },
      } as StoredVis,
      [{ name: 'search_0', id: '123', type: 'search' }]
    );
    expect(savedVis.data.savedSearchId).toBe('123');
  });

  test('injects discover session reference even if it is already injected', () => {
    const savedVis = injectVisReferences(
      {
        data: {
          searchSource: {},
          savedSearchId: '789',
        },
      } as StoredVis,
      [{ name: 'search_0', id: '123', type: 'search' }]
    );
    expect(savedVis.data.savedSearchId).toBe('123');
  });
});
