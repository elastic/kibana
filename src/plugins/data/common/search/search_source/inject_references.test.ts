/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from '@kbn/core/types';
import { SerializedSearchSourceFields } from './types';

import { injectReferences } from './inject_references';

describe('injectSearchSourceReferences', () => {
  let searchSourceJSON: SerializedSearchSourceFields & { indexRefName: string };
  let references: SavedObjectReference[];

  beforeEach(() => {
    searchSourceJSON = {
      highlightAll: true,
      version: true,
      query: {
        query: 'play_name:"Henry IV"',
        language: 'kuery',
      },
      indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
    };
    references = [
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
        id: '033af690-fde7-11ea-91f3-fb9e73f9bbe9',
      },
    ];
  });

  test('injects references', () => {
    const actual = injectReferences(searchSourceJSON, references);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "highlightAll": true,
        "index": "033af690-fde7-11ea-91f3-fb9e73f9bbe9",
        "query": Object {
          "language": "kuery",
          "query": "play_name:\\"Henry IV\\"",
        },
        "version": true,
      }
    `);
  });

  test('skips injecting references if none exists', () => {
    // @ts-expect-error
    delete searchSourceJSON.indexRefName;
    references = [];
    const actual = injectReferences(searchSourceJSON, references);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "highlightAll": true,
        "query": Object {
          "language": "kuery",
          "query": "play_name:\\"Henry IV\\"",
        },
        "version": true,
      }
    `);
  });

  test('throws an error if there is a broken reference', () => {
    searchSourceJSON.indexRefName = 'oops';
    expect(() => injectReferences(searchSourceJSON, references)).toThrowErrorMatchingInlineSnapshot(
      `"Could not find reference for oops"`
    );
  });

  test('handles filters', () => {
    searchSourceJSON.filter = [
      // @ts-expect-error
      { meta: { indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' } },
    ];
    const actual = injectReferences(searchSourceJSON, references);
    expect(actual).toMatchInlineSnapshot(`
      Object {
        "filter": Array [
          Object {
            "meta": Object {
              "index": "033af690-fde7-11ea-91f3-fb9e73f9bbe9",
            },
          },
        ],
        "highlightAll": true,
        "index": "033af690-fde7-11ea-91f3-fb9e73f9bbe9",
        "query": Object {
          "language": "kuery",
          "query": "play_name:\\"Henry IV\\"",
        },
        "version": true,
      }
    `);
  });

  test('throws an error if there is a broken filter reference', () => {
    // @ts-expect-error
    searchSourceJSON.filter = [{ meta: { indexRefName: 'oops' } }];
    expect(() => injectReferences(searchSourceJSON, references)).toThrowErrorMatchingInlineSnapshot(
      `"Could not find reference for oops"`
    );
  });
});
