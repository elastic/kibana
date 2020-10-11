/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObjectReference } from 'src/core/types';
import { SearchSourceFields } from './types';

import { injectReferences } from './inject_references';

describe('injectSearchSourceReferences', () => {
  let searchSourceJSON: SearchSourceFields & { indexRefName: string };
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
