/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SavedObjectsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

import { savedObjectsServiceMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

import { getSavedSearch } from './get_saved_searches';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';

describe('getSavedSearch', () => {
  let search: DataPublicPluginStart['search'];
  let savedObjectsClient: SavedObjectsStart['client'];

  beforeEach(() => {
    savedObjectsClient = savedObjectsServiceMock.createStartContract().client;
    search = dataPluginMock.createStartContract().search;
  });

  test('should return empty saved search in case of no id', async () => {
    const savedSearch = await getSavedSearch(undefined, {
      savedObjectsClient,
      search,
    });

    expect(search.searchSource.createEmpty).toHaveBeenCalled();
    expect(savedSearch).toHaveProperty('searchSource');
  });

  test('should throw an error if so not found', async () => {
    let errorMessage = 'No error thrown.';
    savedObjectsClient.resolve = jest.fn().mockReturnValue({
      saved_object: {
        attributes: {},
        error: {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object [search/ccf1af80-2297-11ec-86e0-1155ffb9c7a7] not found',
        },
        id: 'ccf1af80-2297-11ec-86e0-1155ffb9c7a7',
        type: 'search',
        references: [],
      },
    });

    try {
      await getSavedSearch('ccf1af80-2297-11ec-86e0-1155ffb9c7a7', {
        savedObjectsClient,
        search,
      });
    } catch (error) {
      errorMessage = error.message;
    }

    expect(errorMessage).toBe(
      'Could not locate that search (id: ccf1af80-2297-11ec-86e0-1155ffb9c7a7)'
    );
  });

  test('should find saved search', async () => {
    savedObjectsClient.resolve = jest.fn().mockReturnValue({
      saved_object: {
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
      outcome: 'exactMatch',
    });

    const savedSearch = await getSavedSearch('ccf1af80-2297-11ec-86e0-1155ffb9c7a7', {
      savedObjectsClient,
      search,
    });

    expect(savedObjectsClient.resolve).toHaveBeenCalled();
    expect(savedSearch).toMatchInlineSnapshot(`
      Object {
        "breakdownField": undefined,
        "columns": Array [
          "_source",
        ],
        "description": "description",
        "grid": Object {},
        "hideAggregatedPreview": undefined,
        "hideChart": false,
        "id": "ccf1af80-2297-11ec-86e0-1155ffb9c7a7",
        "isTextBasedQuery": undefined,
        "refreshInterval": undefined,
        "rowHeight": undefined,
        "rowsPerPage": undefined,
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
          "onRequestStart": [MockFunction],
          "parseActiveIndexPatternFromQueryString": [MockFunction],
          "removeField": [MockFunction],
          "serialize": [MockFunction],
          "setField": [MockFunction],
          "setFields": [MockFunction],
          "setOverwriteDataViewType": [MockFunction],
          "setParent": [MockFunction],
          "toExpressionAst": [MockFunction],
        },
        "sharingSavedObjectProps": Object {
          "aliasPurpose": undefined,
          "aliasTargetId": undefined,
          "errorJSON": undefined,
          "outcome": "exactMatch",
        },
        "sort": Array [
          Array [
            "order_date",
            "desc",
          ],
        ],
        "tags": undefined,
        "timeRange": undefined,
        "timeRestore": undefined,
        "title": "test1",
        "usesAdHocDataView": undefined,
        "viewMode": undefined,
      }
    `);
  });

  test('should find saved search with sql mode', async () => {
    savedObjectsClient.resolve = jest.fn().mockReturnValue({
      saved_object: {
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
      outcome: 'exactMatch',
    });

    const savedSearch = await getSavedSearch('ccf1af80-2297-11ec-86e0-1155ffb9c7a7', {
      savedObjectsClient,
      search,
    });

    expect(savedObjectsClient.resolve).toHaveBeenCalled();
    expect(savedSearch).toMatchInlineSnapshot(`
      Object {
        "breakdownField": undefined,
        "columns": Array [
          "_source",
        ],
        "description": "description",
        "grid": Object {},
        "hideAggregatedPreview": undefined,
        "hideChart": true,
        "id": "ccf1af80-2297-11ec-86e0-1155ffb9c7a7",
        "isTextBasedQuery": true,
        "refreshInterval": undefined,
        "rowHeight": undefined,
        "rowsPerPage": undefined,
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
          "onRequestStart": [MockFunction],
          "parseActiveIndexPatternFromQueryString": [MockFunction],
          "removeField": [MockFunction],
          "serialize": [MockFunction],
          "setField": [MockFunction],
          "setFields": [MockFunction],
          "setOverwriteDataViewType": [MockFunction],
          "setParent": [MockFunction],
          "toExpressionAst": [MockFunction],
        },
        "sharingSavedObjectProps": Object {
          "aliasPurpose": undefined,
          "aliasTargetId": undefined,
          "errorJSON": undefined,
          "outcome": "exactMatch",
        },
        "sort": Array [
          Array [
            "order_date",
            "desc",
          ],
        ],
        "tags": undefined,
        "timeRange": undefined,
        "timeRestore": undefined,
        "title": "test2",
        "usesAdHocDataView": undefined,
        "viewMode": undefined,
      }
    `);
  });

  it('should call savedObjectsTagging.ui.getTagIdsFromReferences', async () => {
    savedObjectsClient.resolve = jest.fn().mockReturnValue({
      saved_object: {
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
      outcome: 'exactMatch',
    });
    const savedObjectsTagging = {
      ui: {
        getTagIdsFromReferences: jest.fn((_, tags) => tags),
      },
    } as unknown as SavedObjectsTaggingApi;
    await getSavedSearch('ccf1af80-2297-11ec-86e0-1155ffb9c7a7', {
      savedObjectsClient,
      search,
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
