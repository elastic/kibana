/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fromSavedSearchAttributes, toSavedSearchAttributes } from './saved_searches_utils';

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';

import type { SavedSearch, SavedSearchAttributes } from '../types';

describe('saved_searches_utils', () => {
  describe('fromSavedSearchAttributes', () => {
    test('should convert attributes into SavedSearch', () => {
      const attributes: SavedSearchAttributes = {
        kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
        title: 'saved search',
        sort: [],
        columns: ['a', 'b'],
        description: 'foo',
        grid: {},
        hideChart: true,
        isTextBasedQuery: false,
        usesAdHocDataView: false,
        rowsPerPage: 250,
        sampleSize: 1000,
        breakdownField: 'extension.keyword',
      };

      expect(
        fromSavedSearchAttributes(
          'id',
          attributes,
          ['tags-1', 'tags-2'],
          [],
          createSearchSourceMock(),
          {},
          false
        )
      ).toMatchInlineSnapshot(`
        Object {
          "breakdownField": "extension.keyword",
          "columns": Array [
            "a",
            "b",
          ],
          "description": "foo",
          "grid": Object {},
          "headerRowHeight": undefined,
          "hideAggregatedPreview": undefined,
          "hideChart": true,
          "id": "id",
          "isTextBasedQuery": false,
          "managed": false,
          "references": Array [],
          "refreshInterval": undefined,
          "rowHeight": undefined,
          "rowsPerPage": 250,
          "sampleSize": 1000,
          "searchSource": SearchSource {
            "dependencies": Object {
              "aggs": Object {
                "createAggConfigs": [MockFunction],
              },
              "getConfig": [MockFunction],
              "onResponse": [MockFunction],
              "scriptedFieldsEnabled": true,
              "search": [MockFunction],
            },
            "fields": Object {},
            "getFieldName": [Function],
            "history": Array [],
            "id": "data_source1",
            "inheritOptions": Object {},
            "overwriteDataViewType": undefined,
            "parent": undefined,
            "requestStartHandlers": Array [],
            "shouldOverwriteDataViewType": false,
          },
          "sharingSavedObjectProps": Object {},
          "sort": Array [],
          "tags": Array [
            "tags-1",
            "tags-2",
          ],
          "timeRange": undefined,
          "timeRestore": undefined,
          "title": "saved search",
          "usesAdHocDataView": false,
          "viewMode": undefined,
          "visContext": undefined,
        }
      `);
    });
  });

  describe('toSavedSearchAttributes', () => {
    test('should serialize SavedSearch attributes', () => {
      const savedSearch: SavedSearch = {
        id: 'id',
        searchSource: createSearchSourceMock(),
        title: 'title',
        sort: [['a', 'asc']],
        columns: ['c', 'd'],
        description: 'description',
        grid: {},
        hideChart: true,
        isTextBasedQuery: true,
        usesAdHocDataView: false,
        managed: false,
      };

      expect(toSavedSearchAttributes(savedSearch, '{}')).toMatchInlineSnapshot(`
        Object {
          "breakdownField": undefined,
          "columns": Array [
            "c",
            "d",
          ],
          "description": "description",
          "grid": Object {},
          "headerRowHeight": undefined,
          "hideAggregatedPreview": undefined,
          "hideChart": true,
          "isTextBasedQuery": true,
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "{}",
          },
          "refreshInterval": undefined,
          "rowHeight": undefined,
          "rowsPerPage": undefined,
          "sampleSize": undefined,
          "sort": Array [
            Array [
              "a",
              "asc",
            ],
          ],
          "timeRange": undefined,
          "timeRestore": false,
          "title": "title",
          "usesAdHocDataView": false,
          "viewMode": undefined,
          "visContext": undefined,
        }
      `);
    });
  });
});
