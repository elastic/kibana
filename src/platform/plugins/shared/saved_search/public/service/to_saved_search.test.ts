/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import type { SavedSearchByValueAttributes } from '../../common';
import { byValueToSavedSearch } from './to_saved_search';
import type { DiscoverSessionTab } from '../../server';

const mockServices = {
  contentManagement: contentManagementMock.createStartContract().client,
  search: dataPluginMock.createStartContract().search,
  spaces: spacesPluginMock.createStartContract(),
};

describe('toSavedSearch', () => {
  it('succesfully converts attributes to saved search', async () => {
    const tabs: DiscoverSessionTab[] = [
      {
        id: 'tab-1',
        label: 'Tab 1',
        attributes: {
          kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
          sort: [['@timestamp', 'desc']],
          columns: ['message', 'extension'],
          grid: {},
          hideChart: false,
          isTextBasedQuery: false,
        },
      },
    ];
    const attributes: SavedSearchByValueAttributes = {
      title: 'saved-search-title',
      description: '',
      sort: [['@timestamp', 'desc']],
      columns: ['message', 'extension'],
      grid: {},
      hideChart: false,
      isTextBasedQuery: false,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{}',
      },
      tabs,
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
        "chartInterval": undefined,
        "columns": Array [
          "message",
          "extension",
        ],
        "controlGroupJson": undefined,
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
        "tabs": Array [
          Object {
            "attributes": Object {
              "columns": Array [
                "message",
                "extension",
              ],
              "grid": Object {},
              "hideChart": false,
              "isTextBasedQuery": false,
              "kibanaSavedObjectMeta": Object {
                "searchSourceJSON": "{}",
              },
              "sort": Array [
                Array [
                  "@timestamp",
                  "desc",
                ],
              ],
            },
            "id": "tab-1",
            "label": "Tab 1",
          },
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

  it('uses attributes from `tabs`', async () => {
    const tabs: DiscoverSessionTab[] = [
      {
        id: 'tab-1',
        label: 'Tab 1',
        attributes: {
          kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
          sort: [['my_tab_sort', 'desc']],
          columns: ['my', 'tab', 'columns'],
          grid: {},
          hideChart: false,
          isTextBasedQuery: false,
        },
      },
    ];
    const attributes: SavedSearchByValueAttributes = {
      title: 'saved-search-title',
      description: '',
      sort: [['@timestamp', 'desc']],
      columns: ['message', 'extension'],
      grid: {},
      hideChart: false,
      isTextBasedQuery: false,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{}',
      },
      tabs,
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
        "chartInterval": undefined,
        "columns": Array [
          "my",
          "tab",
          "columns",
        ],
        "controlGroupJson": undefined,
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
            "my_tab_sort",
            "desc",
          ],
        ],
        "tabs": Array [
          Object {
            "attributes": Object {
              "columns": Array [
                "my",
                "tab",
                "columns",
              ],
              "grid": Object {},
              "hideChart": false,
              "isTextBasedQuery": false,
              "kibanaSavedObjectMeta": Object {
                "searchSourceJSON": "{}",
              },
              "sort": Array [
                Array [
                  "my_tab_sort",
                  "desc",
                ],
              ],
            },
            "id": "tab-1",
            "label": "Tab 1",
          },
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
