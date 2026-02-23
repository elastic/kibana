/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromSavedSearchAttributes, toSavedSearchAttributes } from './saved_searches_utils';

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';

import type { SavedSearch, SavedSearchAttributes } from '../types';
import type { DiscoverSessionTab } from '../../server';

describe('saved_searches_utils', () => {
  describe('fromSavedSearchAttributes', () => {
    test('should convert attributes into SavedSearch', () => {
      const tabs: DiscoverSessionTab[] = [
        {
          id: 'tab-1',
          label: 'Tab 1',
          attributes: {
            kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
            sort: [],
            columns: ['a', 'b'],
            grid: {},
            hideChart: true,
            isTextBasedQuery: false,
            usesAdHocDataView: false,
            rowsPerPage: 250,
            sampleSize: 1000,
            breakdownField: 'extension.keyword',
            chartInterval: 'm',
          },
        },
      ];
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
        chartInterval: 'm',
        controlGroupJson: undefined,
        tabs,
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
          "chartInterval": "m",
          "columns": Array [
            "a",
            "b",
          ],
          "controlGroupJson": undefined,
          "density": undefined,
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
              "dataViews": Object {
                "getMetaFields": [MockFunction],
                "getShortDotsEnable": [MockFunction],
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
          "tabs": Array [
            Object {
              "attributes": Object {
                "breakdownField": "extension.keyword",
                "chartInterval": "m",
                "columns": Array [
                  "a",
                  "b",
                ],
                "grid": Object {},
                "hideChart": true,
                "isTextBasedQuery": false,
                "kibanaSavedObjectMeta": Object {
                  "searchSourceJSON": "{}",
                },
                "rowsPerPage": 250,
                "sampleSize": 1000,
                "sort": Array [],
                "usesAdHocDataView": false,
              },
              "id": "tab-1",
              "label": "Tab 1",
            },
          ],
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

      const result = toSavedSearchAttributes(savedSearch, '{}');
      expect(result).toEqual({
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
        title: 'title',
        sort: [['a', 'asc']],
        columns: ['c', 'd'],
        description: 'description',
        grid: {},
        hideChart: true,
        isTextBasedQuery: true,
        usesAdHocDataView: false,
        timeRestore: false,
        tabs: [
          {
            id: expect.any(String),
            label: 'Untitled',
            attributes: {
              kibanaSavedObjectMeta: {
                searchSourceJSON: '{}',
              },
              sort: [['a', 'asc']],
              columns: ['c', 'd'],
              grid: {},
              hideChart: true,
              isTextBasedQuery: true,
              usesAdHocDataView: false,
              timeRestore: false,
            },
          },
        ],
      });
    });
  });
});
