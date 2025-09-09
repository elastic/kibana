/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { injectVisReferences } from './inject_vis_references';

describe('injectVisReferences', () => {
  test('injects data view reference', () => {
    const savedVis = injectVisReferences(
      {
        type: 'area',
        params: {},
        data: {
          aggs: [],
          searchSource: {
            indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          },
        },
        title: 'owo',
      },
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
        type: 'area',
        params: {},
        data: {
          aggs: [],
          searchSource: {
            index: '456',
          },
        },
        title: 'owo',
      },
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
        type: 'area',
        params: {},
        data: {
          aggs: [],
          searchSource: {},
        },
        title: 'owo',
      },
      [{ name: 'search_0', id: '123', type: 'search' }]
    );
    expect(savedVis.data.savedSearchId).toBe('123');
  });

  test('injects discover session reference even if it is already injected', () => {
    const savedVis = injectVisReferences(
      {
        type: 'area',
        params: {},
        data: {
          aggs: [],
          searchSource: {},
          savedSearchId: '789',
        },
        title: 'owo',
      },
      [{ name: 'search_0', id: '123', type: 'search' }]
    );
    expect(savedVis.data.savedSearchId).toBe('123');
  });
});
