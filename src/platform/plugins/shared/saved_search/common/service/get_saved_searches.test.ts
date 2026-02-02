/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { getSavedSearch } from './get_saved_searches';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { GetSavedSearchDependencies } from './get_saved_searches';

describe('getSavedSearch', () => {
  let searchSourceCreate: DataPublicPluginStart['search']['searchSource']['create'];
  let getSavedSrch: GetSavedSearchDependencies['getSavedSrch'];

  beforeEach(() => {
    getSavedSrch = jest.fn();
    searchSourceCreate = dataPluginMock.createStartContract().search.searchSource.create;
  });

  test('should find saved search', async () => {
    getSavedSrch = jest.fn().mockReturnValue({
      item: {
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
          },
          title: 'test1',
          sort: [['order_date', 'desc']],
          columns: ['_source'],
          description: 'description',
          grid: {},
          hideChart: false,
          sampleSize: 100,
          tabs: [
            {
              id: 'my_tab',
              label: 'My Tab',
              attributes: {
                kibanaSavedObjectMeta: {
                  searchSourceJSON:
                    '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
                },
                sort: [['order_date', 'desc']],
                columns: ['_source'],
                grid: {},
                hideChart: false,
                sampleSize: 100,
              },
            },
          ],
        },
        id: 'ccf1af80-2297-11ec-86e0-1155ffb9c7a7',
        type: 'search',
        references: [
          {
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
            type: 'index-pattern',
          },
        ],
        namespaces: ['default'],
      },
      meta: {
        outcome: 'exactMatch',
      },
    });

    const savedSearch = await getSavedSearch('ccf1af80-2297-11ec-86e0-1155ffb9c7a7', {
      getSavedSrch,
      searchSourceCreate,
    });

    expect(getSavedSrch).toHaveBeenCalled();
    expect(savedSearch).toMatchInlineSnapshot(`
      Object {
        "breakdownField": undefined,
        "chartInterval": undefined,
        "columns": Array [
          "_source",
        ],
        "controlGroupJson": undefined,
        "density": undefined,
        "description": "description",
        "grid": Object {},
        "headerRowHeight": undefined,
        "hideAggregatedPreview": undefined,
        "hideChart": false,
        "id": "ccf1af80-2297-11ec-86e0-1155ffb9c7a7",
        "isTextBasedQuery": undefined,
        "managed": false,
        "references": Array [
          Object {
            "id": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
          },
        ],
        "refreshInterval": undefined,
        "rowHeight": undefined,
        "rowsPerPage": undefined,
        "sampleSize": 100,
        "searchSource": Object {
          "create": [MockFunction],
          "createChild": [MockFunction],
          "createCopy": [MockFunction],
          "destroy": [MockFunction],
          "fetch": [MockFunction],
          "fetch$": [MockFunction],
          "getActiveIndexFilter": [MockFunction],
          "getField": [MockFunction],
          "getFields": [MockFunction],
          "getId": [MockFunction],
          "getOwnField": [MockFunction],
          "getParent": [MockFunction],
          "getSearchRequestBody": [MockFunction],
          "getSerializedFields": [MockFunction],
          "history": Array [],
          "loadDataViewFields": [MockFunction],
          "onRequestStart": [MockFunction],
          "parseActiveIndexPatternFromQueryString": [MockFunction],
          "removeField": [MockFunction],
          "serialize": [MockFunction],
          "setField": [MockFunction],
          "setOverwriteDataViewType": [MockFunction],
          "setParent": [MockFunction],
          "toExpressionAst": [MockFunction],
        },
        "sharingSavedObjectProps": Object {
          "outcome": "exactMatch",
        },
        "sort": Array [
          Array [
            "order_date",
            "desc",
          ],
        ],
        "tabs": Array [
          Object {
            "attributes": Object {
              "columns": Array [
                "_source",
              ],
              "grid": Object {},
              "hideChart": false,
              "kibanaSavedObjectMeta": Object {
                "searchSourceJSON": "{\\"query\\":{\\"query\\":\\"\\",\\"language\\":\\"kuery\\"},\\"filter\\":[],\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
              },
              "sampleSize": 100,
              "sort": Array [
                Array [
                  "order_date",
                  "desc",
                ],
              ],
            },
            "id": "my_tab",
            "label": "My Tab",
          },
        ],
        "tags": undefined,
        "timeRange": undefined,
        "timeRestore": undefined,
        "title": "test1",
        "usesAdHocDataView": undefined,
        "viewMode": undefined,
        "visContext": undefined,
      }
    `);
  });

  test('should find saved search with sql mode', async () => {
    getSavedSrch = jest.fn().mockReturnValue({
      item: {
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"query":{"sql":"SELECT * FROM foo"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
          },
          title: 'test2',
          sort: [['order_date', 'desc']],
          columns: ['_source'],
          description: 'description',
          grid: {},
          hideChart: true,
          isTextBasedQuery: true,
          tabs: [
            {
              id: 'my_tab',
              label: 'My Tab',
              attributes: {
                kibanaSavedObjectMeta: {
                  searchSourceJSON:
                    '{"query":{"sql":"SELECT * FROM foo"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
                },
                sort: [['order_date', 'desc']],
                columns: ['_source'],
                grid: {},
                hideChart: true,
                isTextBasedQuery: true,
              },
            },
          ],
        },
        id: 'ccf1af80-2297-11ec-86e0-1155ffb9c7a7',
        type: 'search',
        references: [
          {
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
            type: 'index-pattern',
          },
        ],
        namespaces: ['default'],
      },
      meta: {
        outcome: 'exactMatch',
      },
    });

    const savedSearch = await getSavedSearch('ccf1af80-2297-11ec-86e0-1155ffb9c7a7', {
      getSavedSrch,
      searchSourceCreate,
    });

    expect(getSavedSrch).toHaveBeenCalled();
    expect(savedSearch).toMatchInlineSnapshot(`
      Object {
        "breakdownField": undefined,
        "chartInterval": undefined,
        "columns": Array [
          "_source",
        ],
        "controlGroupJson": undefined,
        "density": undefined,
        "description": "description",
        "grid": Object {},
        "headerRowHeight": undefined,
        "hideAggregatedPreview": undefined,
        "hideChart": true,
        "id": "ccf1af80-2297-11ec-86e0-1155ffb9c7a7",
        "isTextBasedQuery": true,
        "managed": false,
        "references": Array [
          Object {
            "id": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
            "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
            "type": "index-pattern",
          },
        ],
        "refreshInterval": undefined,
        "rowHeight": undefined,
        "rowsPerPage": undefined,
        "sampleSize": undefined,
        "searchSource": Object {
          "create": [MockFunction],
          "createChild": [MockFunction],
          "createCopy": [MockFunction],
          "destroy": [MockFunction],
          "fetch": [MockFunction],
          "fetch$": [MockFunction],
          "getActiveIndexFilter": [MockFunction],
          "getField": [MockFunction],
          "getFields": [MockFunction],
          "getId": [MockFunction],
          "getOwnField": [MockFunction],
          "getParent": [MockFunction],
          "getSearchRequestBody": [MockFunction],
          "getSerializedFields": [MockFunction],
          "history": Array [],
          "loadDataViewFields": [MockFunction],
          "onRequestStart": [MockFunction],
          "parseActiveIndexPatternFromQueryString": [MockFunction],
          "removeField": [MockFunction],
          "serialize": [MockFunction],
          "setField": [MockFunction],
          "setOverwriteDataViewType": [MockFunction],
          "setParent": [MockFunction],
          "toExpressionAst": [MockFunction],
        },
        "sharingSavedObjectProps": Object {
          "outcome": "exactMatch",
        },
        "sort": Array [
          Array [
            "order_date",
            "desc",
          ],
        ],
        "tabs": Array [
          Object {
            "attributes": Object {
              "columns": Array [
                "_source",
              ],
              "grid": Object {},
              "hideChart": true,
              "isTextBasedQuery": true,
              "kibanaSavedObjectMeta": Object {
                "searchSourceJSON": "{\\"query\\":{\\"sql\\":\\"SELECT * FROM foo\\"},\\"filter\\":[],\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
              },
              "sort": Array [
                Array [
                  "order_date",
                  "desc",
                ],
              ],
            },
            "id": "my_tab",
            "label": "My Tab",
          },
        ],
        "tags": undefined,
        "timeRange": undefined,
        "timeRestore": undefined,
        "title": "test2",
        "usesAdHocDataView": undefined,
        "viewMode": undefined,
        "visContext": undefined,
      }
    `);
  });

  test('should initialize searchSource from tab if kibanaSavedObjectMeta only exists in tab', async () => {
    getSavedSrch = jest.fn().mockReturnValue({
      item: {
        attributes: {
          title: 'test3',
          sort: [['order_date', 'desc']],
          columns: ['_source'],
          description: 'description',
          grid: {},
          hideChart: false,
          sampleSize: 100,
          tabs: [
            {
              id: 'tab_with_meta',
              label: 'Tab With Meta',
              attributes: {
                kibanaSavedObjectMeta: {
                  searchSourceJSON:
                    '{"query":{"query":"tab-query","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
                },
                sort: [['order_date', 'desc']],
                columns: ['_source'],
                grid: {},
                hideChart: false,
                sampleSize: 100,
              },
            },
          ],
        },
        id: 'ccf1af80-2297-11ec-86e0-1155ffb9c7a7',
        type: 'search',
        references: [
          {
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
            type: 'index-pattern',
          },
        ],
        namespaces: ['default'],
      },
      meta: {
        outcome: 'exactMatch',
      },
    });

    const savedSearch = await getSavedSearch(
      'ccf1af80-2297-11ec-86e0-1155ffb9c7a7',
      {
        getSavedSrch,
        searchSourceCreate,
      },
      true
    );

    expect(savedSearch.serializedSearchSource).toMatchInlineSnapshot(`
      Object {
        "filter": Array [],
        "index": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
        "query": Object {
          "language": "kuery",
          "query": "tab-query",
        },
      }
    `);
  });

  it('should call savedObjectsTagging.ui.getTagIdsFromReferences', async () => {
    getSavedSrch = jest.fn().mockReturnValue({
      item: {
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"query":{"sql":"SELECT * FROM foo"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
          },
          title: 'test2',
          sort: [['order_date', 'desc']],
          columns: ['_source'],
          description: 'description',
          grid: {},
          hideChart: true,
          isTextBasedQuery: true,
          tabs: [
            {
              id: 'my_tab',
              label: 'My Tab',
              attributes: {
                kibanaSavedObjectMeta: {
                  searchSourceJSON:
                    '{"query":{"sql":"SELECT * FROM foo"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
                },
                sort: [['order_date', 'desc']],
                columns: ['_source'],
                grid: {},
                hideChart: true,
                isTextBasedQuery: true,
              },
            },
          ],
        },
        id: 'ccf1af80-2297-11ec-86e0-1155ffb9c7a7',
        type: 'search',
        references: [
          {
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
            type: 'index-pattern',
          },
          {
            name: 'tag-1',
            id: 'tag-1',
            type: 'tag',
          },
        ],
        namespaces: ['default'],
      },
      meta: {
        outcome: 'exactMatch',
      },
    });
    const savedObjectsTagging = {
      ui: {
        getTagIdsFromReferences: jest.fn((_, tags) => tags),
      },
    } as unknown as SavedObjectsTaggingApi;
    await getSavedSearch('ccf1af80-2297-11ec-86e0-1155ffb9c7a7', {
      getSavedSrch,
      searchSourceCreate,
      savedObjectsTagging,
    });
    expect(savedObjectsTagging.ui.getTagIdsFromReferences).toHaveBeenCalledWith([
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
        type: 'index-pattern',
      },
      {
        name: 'tag-1',
        id: 'tag-1',
        type: 'tag',
      },
    ]);
  });
});
