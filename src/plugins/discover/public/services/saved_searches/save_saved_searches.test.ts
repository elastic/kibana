/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsStart } from 'kibana/public';

import { savedObjectsServiceMock } from '../../../../../core/public/mocks';
import { dataPluginMock } from '../../../../data/public/mocks';

import { saveSavedSearch } from './save_saved_searches';
import type { SavedSearch } from './types';

describe('saveSavedSearch', () => {
  let savedObjectsClient: SavedObjectsStart['client'];
  let savedSearch: SavedSearch;

  beforeEach(() => {
    savedObjectsClient = savedObjectsServiceMock.createStartContract().client;
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
    } as SavedSearch;
  });

  describe('onTitleDuplicate', () => {
    test('should check for title duplicating', async () => {
      savedObjectsClient.find = jest.fn().mockReturnValue({
        savedObjects: [{ get: () => 'title' }],
      });
      const onTitleDuplicate = jest.fn();

      await saveSavedSearch(
        savedSearch,
        {
          onTitleDuplicate,
          copyOnSave: true,
        },
        savedObjectsClient
      );

      expect(onTitleDuplicate).toHaveBeenCalled();
    });

    test('should not check for title duplicating for saving existing search', async () => {
      savedObjectsClient.find = jest.fn().mockReturnValue({
        savedObjects: [{ get: () => 'title' }],
      });
      const onTitleDuplicate = jest.fn();

      await saveSavedSearch(
        savedSearch,
        {
          onTitleDuplicate,
          copyOnSave: false,
        },
        savedObjectsClient
      );

      expect(onTitleDuplicate).not.toHaveBeenCalled();
    });
  });

  test('should call savedObjectsClient.create for saving new search', async () => {
    delete savedSearch.id;

    await saveSavedSearch(savedSearch, {}, savedObjectsClient);

    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'search',
      {
        columns: [],
        description: '',
        grid: {},
        hideChart: false,
        kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
        sort: [],
        title: 'title',
      },
      { references: [] }
    );
  });

  test('should call savedObjectsClient.update for saving existing search', async () => {
    await saveSavedSearch(savedSearch, {}, savedObjectsClient);

    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      'search',
      'id',
      {
        columns: [],
        description: '',
        grid: {},
        hideChart: false,
        kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
        sort: [],
        title: 'title',
      },
      { references: [] }
    );
  });
});
