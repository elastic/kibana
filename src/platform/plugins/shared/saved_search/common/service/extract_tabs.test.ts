/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { SavedObjectModelTransformationContext } from '@kbn/core-saved-objects-server';
import type { TypeOf } from '@kbn/config-schema';
import type { SCHEMA_SEARCH_MODEL_VERSION_5 } from '../../server/saved_objects/schema';
import { extractTabs, extractTabsBackfillFn, SavedSearchType, VIEW_MODE } from '..';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

const mockContext = {} as SavedObjectModelTransformationContext;

describe('extractTabs', () => {
  describe('extractTabs', () => {
    it('should extract title and description and move the rest to tabs.attributes', () => {
      const attributes: TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_5> = {
        kibanaSavedObjectMeta: {
          searchSourceJSON:
            '{"query":{"language":"kuery","query":"service.type: \\"elasticsearch\\""},"highlightAll":true,"fields":[{"field":"*","include_unmapped":true}],"sort":[{"@timestamp":{"order":"desc","format":"strict_date_optional_time"}},{"_doc":"desc"}],"filter":[{"meta":{"disabled":false,"negate":false,"alias":null,"key":"service.type","field":"service.type","params":{"query":"elasticsearch"},"type":"phrase","indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index"},"query":{"match_phrase":{"service.type":"elasticsearch"}},"$state":{"store":"appState"}}],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
        },
        title: 'my_title',
        sort: [['@timestamp', 'desc']],
        columns: ['message'],
        description: 'my description',
        grid: {},
        hideChart: false,
        viewMode: VIEW_MODE.DOCUMENT_LEVEL,
        isTextBasedQuery: false,
        timeRestore: false,
      };

      const result = extractTabs(attributes);

      expect(result.title).toBe(attributes.title);
      expect(result.description).toBe(attributes.description);
      expect(result.tabs).toBeInstanceOf(Array);
      expect(result).toMatchInlineSnapshot(`
        Object {
          "columns": Array [
            "message",
          ],
          "description": "my description",
          "grid": Object {},
          "hideChart": false,
          "isTextBasedQuery": false,
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "{\\"query\\":{\\"language\\":\\"kuery\\",\\"query\\":\\"service.type: \\\\\\"elasticsearch\\\\\\"\\"},\\"highlightAll\\":true,\\"fields\\":[{\\"field\\":\\"*\\",\\"include_unmapped\\":true}],\\"sort\\":[{\\"@timestamp\\":{\\"order\\":\\"desc\\",\\"format\\":\\"strict_date_optional_time\\"}},{\\"_doc\\":\\"desc\\"}],\\"filter\\":[{\\"meta\\":{\\"disabled\\":false,\\"negate\\":false,\\"alias\\":null,\\"key\\":\\"service.type\\",\\"field\\":\\"service.type\\",\\"params\\":{\\"query\\":\\"elasticsearch\\"},\\"type\\":\\"phrase\\",\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index\\"},\\"query\\":{\\"match_phrase\\":{\\"service.type\\":\\"elasticsearch\\"}},\\"$state\\":{\\"store\\":\\"appState\\"}}],\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
          },
          "sort": Array [
            Array [
              "@timestamp",
              "desc",
            ],
          ],
          "tabs": Array [
            Object {
              "attributes": Object {
                "columns": Array [
                  "message",
                ],
                "grid": Object {},
                "hideChart": false,
                "isTextBasedQuery": false,
                "kibanaSavedObjectMeta": Object {
                  "searchSourceJSON": "{\\"query\\":{\\"language\\":\\"kuery\\",\\"query\\":\\"service.type: \\\\\\"elasticsearch\\\\\\"\\"},\\"highlightAll\\":true,\\"fields\\":[{\\"field\\":\\"*\\",\\"include_unmapped\\":true}],\\"sort\\":[{\\"@timestamp\\":{\\"order\\":\\"desc\\",\\"format\\":\\"strict_date_optional_time\\"}},{\\"_doc\\":\\"desc\\"}],\\"filter\\":[{\\"meta\\":{\\"disabled\\":false,\\"negate\\":false,\\"alias\\":null,\\"key\\":\\"service.type\\",\\"field\\":\\"service.type\\",\\"params\\":{\\"query\\":\\"elasticsearch\\"},\\"type\\":\\"phrase\\",\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index\\"},\\"query\\":{\\"match_phrase\\":{\\"service.type\\":\\"elasticsearch\\"}},\\"$state\\":{\\"store\\":\\"appState\\"}}],\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
                },
                "sort": Array [
                  Array [
                    "@timestamp",
                    "desc",
                  ],
                ],
                "timeRestore": false,
                "viewMode": "documents",
              },
              "id": "mock-uuid",
              "label": "Untitled",
            },
          ],
          "timeRestore": false,
          "title": "my_title",
          "viewMode": "documents",
        }
      `);
    });
  });

  describe('extractTabsBackfillFn', () => {
    it('should wrap the result of extractTabs in an object', () => {
      const attributes: TypeOf<typeof SCHEMA_SEARCH_MODEL_VERSION_5> = {
        kibanaSavedObjectMeta: {
          searchSourceJSON:
            '{"query":{"language":"kuery","query":"service.type: \\"elasticsearch\\""},"highlightAll":true,"fields":[{"field":"*","include_unmapped":true}],"sort":[{"@timestamp":{"order":"desc","format":"strict_date_optional_time"}},{"_doc":"desc"}],"filter":[{"meta":{"disabled":false,"negate":false,"alias":null,"key":"service.type","field":"service.type","params":{"query":"elasticsearch"},"type":"phrase","indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index"},"query":{"match_phrase":{"service.type":"elasticsearch"}},"$state":{"store":"appState"}}],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
        },
        title: 'my_title',
        sort: [['@timestamp', 'desc']],
        columns: ['message'],
        description: 'my description',
        grid: {},
        hideChart: false,
        viewMode: VIEW_MODE.DOCUMENT_LEVEL,
        isTextBasedQuery: false,
        timeRestore: false,
      };

      const prevDoc = { id: '123', type: SavedSearchType, attributes };

      const result = extractTabsBackfillFn(prevDoc, mockContext);

      expect(result).toHaveProperty('attributes');
      expect(result).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "columns": Array [
              "message",
            ],
            "description": "my description",
            "grid": Object {},
            "hideChart": false,
            "isTextBasedQuery": false,
            "kibanaSavedObjectMeta": Object {
              "searchSourceJSON": "{\\"query\\":{\\"language\\":\\"kuery\\",\\"query\\":\\"service.type: \\\\\\"elasticsearch\\\\\\"\\"},\\"highlightAll\\":true,\\"fields\\":[{\\"field\\":\\"*\\",\\"include_unmapped\\":true}],\\"sort\\":[{\\"@timestamp\\":{\\"order\\":\\"desc\\",\\"format\\":\\"strict_date_optional_time\\"}},{\\"_doc\\":\\"desc\\"}],\\"filter\\":[{\\"meta\\":{\\"disabled\\":false,\\"negate\\":false,\\"alias\\":null,\\"key\\":\\"service.type\\",\\"field\\":\\"service.type\\",\\"params\\":{\\"query\\":\\"elasticsearch\\"},\\"type\\":\\"phrase\\",\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index\\"},\\"query\\":{\\"match_phrase\\":{\\"service.type\\":\\"elasticsearch\\"}},\\"$state\\":{\\"store\\":\\"appState\\"}}],\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
            },
            "sort": Array [
              Array [
                "@timestamp",
                "desc",
              ],
            ],
            "tabs": Array [
              Object {
                "attributes": Object {
                  "columns": Array [
                    "message",
                  ],
                  "grid": Object {},
                  "hideChart": false,
                  "isTextBasedQuery": false,
                  "kibanaSavedObjectMeta": Object {
                    "searchSourceJSON": "{\\"query\\":{\\"language\\":\\"kuery\\",\\"query\\":\\"service.type: \\\\\\"elasticsearch\\\\\\"\\"},\\"highlightAll\\":true,\\"fields\\":[{\\"field\\":\\"*\\",\\"include_unmapped\\":true}],\\"sort\\":[{\\"@timestamp\\":{\\"order\\":\\"desc\\",\\"format\\":\\"strict_date_optional_time\\"}},{\\"_doc\\":\\"desc\\"}],\\"filter\\":[{\\"meta\\":{\\"disabled\\":false,\\"negate\\":false,\\"alias\\":null,\\"key\\":\\"service.type\\",\\"field\\":\\"service.type\\",\\"params\\":{\\"query\\":\\"elasticsearch\\"},\\"type\\":\\"phrase\\",\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index\\"},\\"query\\":{\\"match_phrase\\":{\\"service.type\\":\\"elasticsearch\\"}},\\"$state\\":{\\"store\\":\\"appState\\"}}],\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
                  },
                  "sort": Array [
                    Array [
                      "@timestamp",
                      "desc",
                    ],
                  ],
                  "timeRestore": false,
                  "viewMode": "documents",
                },
                "id": "mock-uuid",
                "label": "Untitled",
              },
            ],
            "timeRestore": false,
            "title": "my_title",
            "viewMode": "documents",
          },
        }
      `);
    });
  });
});
