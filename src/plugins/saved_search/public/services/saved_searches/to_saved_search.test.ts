/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { AttributeService, type EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { SavedSearchByValueAttributes, byValueToSavedSearch } from '.';

const mockServices = {
  contentManagement: contentManagementMock.createStartContract().client,
  search: dataPluginMock.createStartContract().search,
  spaces: spacesPluginMock.createStartContract(),
  embeddable: {
    getAttributeService: jest.fn(
      (_, opts) => new AttributeService('search', coreMock.createStart().notifications.toasts, opts)
    ),
  } as unknown as EmbeddableStart,
};

describe('toSavedSearch', () => {
  it('succesfully converts attributes to saved search', async () => {
    const attributes: SavedSearchByValueAttributes = {
      title: 'saved-search-title',
      sort: [['@timestamp', 'desc']],
      columns: ['message', 'extension'],
      grid: {},
      hideChart: false,
      isTextBasedQuery: false,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{}',
      },
      references: [
        {
          id: '1',
          name: 'ref_0',
          type: 'index-pattern',
        },
      ],
    };
    const savedSearch = await byValueToSavedSearch({ attributes }, mockServices);
    expect(savedSearch).toMatchInlineSnapshot(`
      Object {
        "breakdownField": undefined,
        "columns": Array [
          "message",
          "extension",
        ],
        "density": undefined,
        "description": "",
        "grid": Object {},
        "headerRowHeight": undefined,
        "hideAggregatedPreview": undefined,
        "hideChart": false,
        "id": undefined,
        "isTextBasedQuery": false,
        "managed": false,
        "references": Array [
          Object {
            "id": "1",
            "name": "ref_0",
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
        "sharingSavedObjectProps": undefined,
        "sort": Array [
          Array [
            "@timestamp",
            "desc",
          ],
        ],
        "tags": undefined,
        "timeRange": undefined,
        "timeRestore": undefined,
        "title": "saved-search-title",
        "usesAdHocDataView": undefined,
        "viewMode": undefined,
        "visContext": undefined,
      }
    `);
  });
});
