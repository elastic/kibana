/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getSavedSearchUrl,
  getSavedSearchFullPathUrl,
  fromSavedSearchAttributes,
  toSavedSearchAttributes,
  throwErrorOnSavedSearchUrlConflict,
} from './saved_searches_utils';

import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';

import type { SavedSearchAttributes, SavedSearch } from './types';

describe('saved_searches_utils', () => {
  describe('getSavedSearchUrl', () => {
    test('should return valid saved search url', () => {
      expect(getSavedSearchUrl()).toBe('#/');
      expect(getSavedSearchUrl('id')).toBe('#/view/id');
    });
  });

  describe('getSavedSearchFullPathUrl', () => {
    test('should return valid full path url', () => {
      expect(getSavedSearchFullPathUrl()).toBe('/app/discover#/');
      expect(getSavedSearchFullPathUrl('id')).toBe('/app/discover#/view/id');
    });
  });

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
      };

      expect(fromSavedSearchAttributes('id', attributes, createSearchSourceMock(), {}))
        .toMatchInlineSnapshot(`
        Object {
          "columns": Array [
            "a",
            "b",
          ],
          "description": "foo",
          "grid": Object {},
          "hideAggregatedPreview": undefined,
          "hideChart": true,
          "id": "id",
          "rowHeight": undefined,
          "searchSource": SearchSource {
            "dependencies": Object {
              "getConfig": [MockFunction],
              "onResponse": [MockFunction],
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
          "title": "saved search",
          "viewMode": undefined,
        }
      `);
    });
  });

  describe('throwErrorOnSavedSearchUrlConflict', () => {
    test('should throw an error on url conflict', async () => {
      let error = 'no error';

      try {
        await throwErrorOnSavedSearchUrlConflict({
          id: 'id',
          sharingSavedObjectProps: {
            outcome: 'conflict',
            errorJSON: '{}',
          },
        } as SavedSearch);
      } catch (e) {
        error = e.message;
      }

      expect(error).toBe(
        'This search has the same URL as a legacy alias. Disable the alias to resolve this error : {}'
      );
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
      };

      expect(toSavedSearchAttributes(savedSearch, '{}')).toMatchInlineSnapshot(`
        Object {
          "columns": Array [
            "c",
            "d",
          ],
          "description": "description",
          "grid": Object {},
          "hideAggregatedPreview": undefined,
          "hideChart": true,
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "{}",
          },
          "rowHeight": undefined,
          "sort": Array [
            Array [
              "a",
              "asc",
            ],
          ],
          "title": "title",
          "viewMode": undefined,
        }
      `);
    });
  });
});
