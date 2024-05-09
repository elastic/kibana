/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { getSavedSearchAttributeService } from './saved_search_attribute_service';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { AttributeService, type EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { saveSearchSavedObject } from './save_saved_searches';
import {
  SavedSearchByValueAttributes,
  SearchByReferenceInput,
  SearchByValueInput,
  toSavedSearch,
} from '.';
import { omit } from 'lodash';
import {
  type GetSavedSearchDependencies,
  getSearchSavedObject,
} from '../../../common/service/get_saved_searches';
import { createGetSavedSearchDeps } from './create_get_saved_search_deps';

const mockServices = {
  contentManagement: contentManagementMock.createStartContract().client,
  search: dataPluginMock.createStartContract().search,
  spaces: spacesPluginMock.createStartContract(),
  embeddable: {
    getAttributeService: jest.fn(
      (_, opts) =>
        new AttributeService(
          SEARCH_EMBEDDABLE_TYPE,
          coreMock.createStart().notifications.toasts,
          opts
        )
    ),
  } as unknown as EmbeddableStart,
};

jest.mock('./save_saved_searches', () => {
  const actual = jest.requireActual('./save_saved_searches');
  return {
    ...actual,
    saveSearchSavedObject: jest.fn(actual.saveSearchSavedObject),
  };
});

jest.mock('../../../common/service/get_saved_searches', () => {
  const actual = jest.requireActual('../../../common/service/get_saved_searches');
  return {
    ...actual,
    getSearchSavedObject: jest.fn(actual.getSearchSavedObject),
  };
});

jest.mock('./create_get_saved_search_deps', () => {
  const actual = jest.requireActual('./create_get_saved_search_deps');
  let deps: GetSavedSearchDependencies;
  return {
    ...actual,
    createGetSavedSearchDeps: jest.fn().mockImplementation((services) => {
      if (deps) return deps;
      deps = actual.createGetSavedSearchDeps(services);
      return deps;
    }),
  };
});

jest
  .spyOn(mockServices.contentManagement, 'update')
  .mockImplementation(async ({ id }) => ({ item: { id } }));

jest.spyOn(mockServices.contentManagement, 'get').mockImplementation(async ({ id }) => ({
  item: { attributes: { id }, references: [] },
  meta: { outcome: 'success' },
}));

describe('getSavedSearchAttributeService', () => {
  it('should return saved search attribute service', () => {
    const savedSearchAttributeService = getSavedSearchAttributeService(mockServices);
    expect(savedSearchAttributeService).toBeDefined();
  });

  it('should call saveSearchSavedObject when wrapAttributes is called with a by ref saved search', async () => {
    const savedSearchAttributeService = getSavedSearchAttributeService(mockServices);
    const savedObjectId = 'saved-object-id';
    const input: SearchByReferenceInput = {
      id: 'mock-embeddable-id',
      savedObjectId,
      timeRange: { from: 'now-15m', to: 'now' },
    };
    const attrs: SavedSearchByValueAttributes = {
      title: 'saved-search-title',
      sort: [],
      columns: [],
      grid: {},
      hideChart: false,
      isTextBasedQuery: false,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{}',
      },
      references: [],
    };
    const result = await savedSearchAttributeService.wrapAttributes(attrs, true, input);
    expect(result).toEqual(input);
    expect(saveSearchSavedObject).toHaveBeenCalledTimes(1);
    expect(saveSearchSavedObject).toHaveBeenCalledWith(
      savedObjectId,
      {
        ...omit(attrs, 'references'),
        description: '',
      },
      [],
      mockServices.contentManagement
    );
  });

  it('should call getSearchSavedObject when unwrapAttributes is called with a by ref saved search', async () => {
    const savedSearchAttributeService = getSavedSearchAttributeService(mockServices);
    const savedObjectId = 'saved-object-id';
    const input: SearchByReferenceInput = {
      id: 'mock-embeddable-id',
      savedObjectId,
      timeRange: { from: 'now-15m', to: 'now' },
    };
    const result = await savedSearchAttributeService.unwrapAttributes(input);
    expect(result).toEqual({
      attributes: {
        id: savedObjectId,
        references: [],
      },
      metaInfo: {
        sharingSavedObjectProps: {
          outcome: 'success',
        },
      },
    });
    expect(getSearchSavedObject).toHaveBeenCalledTimes(1);
    expect(getSearchSavedObject).toHaveBeenCalledWith(
      savedObjectId,
      createGetSavedSearchDeps(mockServices)
    );
  });

  describe('toSavedSearch', () => {
    it('should convert attributes to saved search', async () => {
      const savedSearchAttributeService = getSavedSearchAttributeService(mockServices);
      const savedObjectId = 'saved-object-id';
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
      const input: SearchByValueInput = {
        id: 'mock-embeddable-id',
        attributes,
        timeRange: { from: 'now-15m', to: 'now' },
      };
      const result = await savedSearchAttributeService.unwrapAttributes(input);
      const savedSearch = await toSavedSearch(savedObjectId, result, mockServices);
      expect(savedSearch).toMatchInlineSnapshot(`
        Object {
          "breakdownField": undefined,
          "columns": Array [
            "message",
            "extension",
          ],
          "description": "",
          "grid": Object {},
          "headerRowHeight": undefined,
          "hideAggregatedPreview": undefined,
          "hideChart": false,
          "id": "saved-object-id",
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
});
