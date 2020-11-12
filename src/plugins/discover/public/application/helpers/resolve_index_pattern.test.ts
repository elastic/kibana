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

import { loadIndexPattern } from './resolve_index_pattern';
import { indexPatternsMock } from '../../__mocks__/index_patterns';
import { configMock } from '../../__mocks__/config';

describe('Resolve index pattern tests', () => {
  test('returns valid data for an existing index pattern', async () => {
    const result = await loadIndexPattern('the-index-pattern-id', indexPatternsMock, configMock);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "list": Array [
          Object {
            "fields": Array [
              Object {
                "filterable": true,
                "name": "_index",
                "scripted": false,
                "type": "string",
              },
              Object {
                "filterable": false,
                "name": "message",
                "scripted": false,
                "type": "string",
              },
              Object {
                "filterable": true,
                "name": "extension",
                "scripted": false,
                "type": "string",
              },
              Object {
                "filterable": true,
                "name": "bytes",
                "scripted": false,
                "type": "number",
              },
              Object {
                "filterable": false,
                "name": "scripted",
                "scripted": true,
                "type": "number",
              },
            ],
            "flattenHit": [Function],
            "formatHit": [MockFunction],
            "getComputedFields": [Function],
            "getFieldByName": [Function],
            "getSourceFiltering": [Function],
            "id": "the-index-pattern-id",
            "metaFields": Array [
              "_index",
              "_score",
            ],
            "title": "the-index-pattern-title",
          },
        ],
        "loaded": Object {
          "fields": Array [
            Object {
              "filterable": true,
              "name": "_index",
              "scripted": false,
              "type": "string",
            },
            Object {
              "filterable": false,
              "name": "message",
              "scripted": false,
              "type": "string",
            },
            Object {
              "filterable": true,
              "name": "extension",
              "scripted": false,
              "type": "string",
            },
            Object {
              "filterable": true,
              "name": "bytes",
              "scripted": false,
              "type": "number",
            },
            Object {
              "filterable": false,
              "name": "scripted",
              "scripted": true,
              "type": "number",
            },
          ],
          "flattenHit": [Function],
          "formatHit": [MockFunction],
          "getComputedFields": [Function],
          "getFieldByName": [Function],
          "getSourceFiltering": [Function],
          "id": "the-index-pattern-id",
          "metaFields": Array [
            "_index",
            "_score",
          ],
          "title": "the-index-pattern-title",
        },
        "stateVal": "the-index-pattern-id",
        "stateValFound": true,
      }
    `);
  });
  test('returns fallback data for an invalid index pattern', async () => {
    const result = await loadIndexPattern('invalid-id', indexPatternsMock, configMock);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "list": Array [
          Object {
            "fields": Array [
              Object {
                "filterable": true,
                "name": "_index",
                "scripted": false,
                "type": "string",
              },
              Object {
                "filterable": false,
                "name": "message",
                "scripted": false,
                "type": "string",
              },
              Object {
                "filterable": true,
                "name": "extension",
                "scripted": false,
                "type": "string",
              },
              Object {
                "filterable": true,
                "name": "bytes",
                "scripted": false,
                "type": "number",
              },
              Object {
                "filterable": false,
                "name": "scripted",
                "scripted": true,
                "type": "number",
              },
            ],
            "flattenHit": [Function],
            "formatHit": [MockFunction],
            "getComputedFields": [Function],
            "getFieldByName": [Function],
            "getSourceFiltering": [Function],
            "id": "the-index-pattern-id",
            "metaFields": Array [
              "_index",
              "_score",
            ],
            "title": "the-index-pattern-title",
          },
        ],
        "loaded": Object {
          "fields": Array [
            Object {
              "filterable": true,
              "name": "_index",
              "scripted": false,
              "type": "string",
            },
            Object {
              "filterable": false,
              "name": "message",
              "scripted": false,
              "type": "string",
            },
            Object {
              "filterable": true,
              "name": "extension",
              "scripted": false,
              "type": "string",
            },
            Object {
              "filterable": true,
              "name": "bytes",
              "scripted": false,
              "type": "number",
            },
            Object {
              "filterable": false,
              "name": "scripted",
              "scripted": true,
              "type": "number",
            },
          ],
          "flattenHit": [Function],
          "formatHit": [MockFunction],
          "getComputedFields": [Function],
          "getFieldByName": [Function],
          "getSourceFiltering": [Function],
          "id": "the-index-pattern-id",
          "metaFields": Array [
            "_index",
            "_score",
          ],
          "title": "the-index-pattern-title",
        },
        "stateVal": "invalid-id",
        "stateValFound": false,
      }
    `);
  });
});
