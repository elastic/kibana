/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

import { saveSavedSearch } from './save_saved_searches';
import type { SavedSearch } from './types';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';

describe('saveSavedSearch', () => {
  let cmApi: ContentManagementPublicStart['client'];
  let savedSearch: SavedSearch;

  beforeEach(() => {
    cmApi = contentManagementMock.createStartContract().client;
    const searchSource = dataPluginMock.createStartContract().search.searchSource.createEmpty();
    savedSearch = {
      id: 'id',
      title: 'title',
      searchSource: {
        ...searchSource,
        serialize: () => ({
          searchSourceJSON: '{}',
          references: [],
        }),
      },
      sharingSavedObjectProps: {
        outcome: 'aliasMatch',
      },
      managed: false,
    } as SavedSearch;
  });

  describe('onTitleDuplicate', () => {
    test('should check for title duplicating', async () => {
      cmApi.search = jest.fn().mockReturnValue({
        hits: [
          {
            attributes: {
              title: 'title',
            },
          },
        ],
      });
      const onTitleDuplicate = jest.fn();

      await saveSavedSearch(
        savedSearch,
        {
          onTitleDuplicate,
          copyOnSave: true,
        },
        cmApi,
        undefined
      );

      expect(onTitleDuplicate).toHaveBeenCalled();
    });

    test('should not check for title duplicating for saving existing search', async () => {
      cmApi.search = jest.fn().mockReturnValue({
        hits: [
          {
            attributes: {
              title: 'title',
            },
          },
        ],
      });
      cmApi.update = jest.fn().mockReturnValue({
        item: {
          id: 'id',
        },
      });
      const onTitleDuplicate = jest.fn();

      await saveSavedSearch(
        savedSearch,
        {
          onTitleDuplicate,
          copyOnSave: false,
        },
        cmApi,
        undefined
      );

      expect(onTitleDuplicate).not.toHaveBeenCalled();
    });
  });

  test('should call savedObjectsClient.create for saving new search', async () => {
    cmApi.search = jest.fn().mockReturnValue({
      hits: [
        {
          attributes: {
            title: 'title',
          },
        },
      ],
    });
    cmApi.create = jest.fn().mockReturnValue({
      item: {
        id: 'id',
      },
    });

    delete savedSearch.id;

    await saveSavedSearch(savedSearch, {}, cmApi, undefined);

    expect(cmApi.create).toHaveBeenCalledWith({
      contentTypeId: 'search',
      data: {
        breakdownField: undefined,
        columns: [],
        description: '',
        grid: {},
        hideAggregatedPreview: undefined,
        hideChart: false,
        isTextBasedQuery: false,
        kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
        refreshInterval: undefined,
        rowHeight: undefined,
        headerRowHeight: undefined,
        rowsPerPage: undefined,
        sampleSize: undefined,
        sort: [],
        timeRange: undefined,
        timeRestore: false,
        title: 'title',
        usesAdHocDataView: undefined,
        viewMode: undefined,
      },
      options: { references: [] },
    });
  });

  test('should call savedObjectsClient.update for saving existing search', async () => {
    cmApi.update = jest.fn().mockReturnValue({
      item: {
        id: 'id',
      },
    });

    await saveSavedSearch(savedSearch, {}, cmApi, undefined);

    expect(cmApi.update).toHaveBeenCalledWith({
      contentTypeId: 'search',
      data: {
        breakdownField: undefined,
        columns: [],
        description: '',
        grid: {},
        hideAggregatedPreview: undefined,
        isTextBasedQuery: false,
        hideChart: false,
        kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
        refreshInterval: undefined,
        rowHeight: undefined,
        headerRowHeight: undefined,
        rowsPerPage: undefined,
        sampleSize: undefined,
        timeRange: undefined,
        sort: [],
        title: 'title',
        timeRestore: false,
        usesAdHocDataView: undefined,
        viewMode: undefined,
      },
      id: 'id',
      options: { references: [] },
    });
  });

  test('should call savedObjectsTagging.ui.updateTagsReferences', async () => {
    cmApi.update = jest.fn().mockReturnValue({
      item: {
        id: 'id',
      },
    });

    const savedObjectsTagging = {
      ui: {
        updateTagsReferences: jest.fn((_, tags) => tags),
      },
    } as unknown as SavedObjectsTaggingApi;
    await saveSavedSearch(
      { ...savedSearch, tags: ['tag-1', 'tag-2'] },
      {},
      cmApi,
      savedObjectsTagging
    );

    expect(savedObjectsTagging.ui.updateTagsReferences).toHaveBeenCalledWith(
      [],
      ['tag-1', 'tag-2']
    );
    expect(cmApi.update).toHaveBeenCalledWith({
      contentTypeId: 'search',
      data: {
        breakdownField: undefined,
        columns: [],
        description: '',
        grid: {},
        hideAggregatedPreview: undefined,
        hideChart: false,
        isTextBasedQuery: false,
        kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
        refreshInterval: undefined,
        rowHeight: undefined,
        headerRowHeight: undefined,
        rowsPerPage: undefined,
        sampleSize: undefined,
        sort: [],
        timeRange: undefined,
        timeRestore: false,
        title: 'title',
        usesAdHocDataView: undefined,
        viewMode: undefined,
      },
      id: 'id',
      options: { references: ['tag-1', 'tag-2'] },
    });
  });
});
