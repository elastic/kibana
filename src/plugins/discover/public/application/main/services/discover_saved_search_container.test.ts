/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';

const mockSaveSavedSearch = jest.fn().mockResolvedValue('123');
jest.mock('@kbn/saved-search-plugin/public', () => {
  const actualPlugin = jest.requireActual('@kbn/saved-search-plugin/public');
  return {
    ...actualPlugin,
    saveSavedSearch: (val: SavedSearch, opts?: SavedObjectSaveOpts) =>
      mockSaveSavedSearch(val, opts),
  };
});
import { getSavedSearchContainer, isEqualSavedSearch } from './discover_saved_search_container';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock, savedSearchMockWithTimeField } from '../../../__mocks__/saved_search';
import { dataViewMock } from '../../../__mocks__/data_view';

describe('DiscoverSavedSearchContainer', () => {
  const savedSearch = savedSearchMock;
  const services = discoverServiceMock;

  describe('set', () => {
    it('should update the current and initial state of the saved search', () => {
      const container = getSavedSearchContainer({ savedSearch, services });
      const newSavedSearch: SavedSearch = { ...savedSearch, title: 'New title' };
      const result = container.set(newSavedSearch);

      expect(result).toBe(newSavedSearch);
      expect(container.get()).toBe(newSavedSearch);
      const initialSavedSearch = container.getInitial$().getValue();
      const currentSavedSearch = container.getCurrent$().getValue();

      expect(isEqualSavedSearch(initialSavedSearch, currentSavedSearch)).toBeTruthy();
    });

    it('should reset hasChanged$ to false', () => {
      const container = getSavedSearchContainer({ savedSearch, services });
      const newSavedSearch: SavedSearch = { ...savedSearch, title: 'New title' };

      container.set(newSavedSearch);
      expect(container.getHasChanged$().getValue()).toBe(false);
    });
  });

  describe('new', () => {
    it('should create a new saved search', async () => {
      const container = getSavedSearchContainer({ savedSearch, services });
      const result = await container.new();

      expect(result.title).toBeUndefined();
      expect(result.id).toBeUndefined();
      const savedSearchState = container.get();
      expect(savedSearchState.id).not.toEqual(savedSearch.id);
      expect(savedSearchState.searchSource.getField('index')).toEqual(
        savedSearch.searchSource.getField('index')
      );
    });

    it('should create a new saved search with provided DataView', async () => {
      const container = getSavedSearchContainer({ savedSearch, services });
      const result = await container.new(dataViewMock);
      expect(result.title).toBeUndefined();
      expect(result.id).toBeUndefined();
      expect(result.searchSource.getField('index')).toBe(dataViewMock);
      expect(container.getHasChanged$().getValue()).toBe(false);
    });
  });

  describe('load', () => {
    discoverServiceMock.data.search.searchSource.create = jest
      .fn()
      .mockReturnValue(savedSearchMock.searchSource);
    discoverServiceMock.core.savedObjects.client.resolve = jest.fn().mockReturnValue({
      saved_object: {
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
          },
          title: 'The saved search that will save the world',
          sort: [],
          columns: ['test123'],
          description: 'description',
          hideChart: false,
        },
        id: 'the-saved-search-id',
        type: 'search',
        references: [
          {
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            id: 'the-data-view-id',
            type: 'index-pattern',
          },
        ],
        namespaces: ['default'],
      },
      outcome: 'exactMatch',
    });

    it('loads a saved search', async () => {
      const savedSearchContainer = getSavedSearchContainer({
        savedSearch: savedSearchMockWithTimeField,
        services: discoverServiceMock,
      });
      await savedSearchContainer.load('the-saved-search-id');
      expect(savedSearchContainer.getInitial$().getValue().id).toEqual('the-saved-search-id');
      expect(savedSearchContainer.getCurrent$().getValue().id).toEqual('the-saved-search-id');
      expect(savedSearchContainer.getHasChanged$().getValue()).toEqual(false);
    });
  });

  describe('persist', () => {
    const saveOptions = { confirmOverwrite: false };

    it('calls saveSavedSearch with the given saved search and save options', async () => {
      const savedSearchContainer = getSavedSearchContainer({
        savedSearch: savedSearchMockWithTimeField,
        services: discoverServiceMock,
      });
      const savedSearchToPersist = {
        ...savedSearchMockWithTimeField,
        title: 'My updated saved search',
      };

      await savedSearchContainer.persist(savedSearchToPersist, saveOptions);
      expect(mockSaveSavedSearch).toHaveBeenCalledWith(savedSearchToPersist, saveOptions);
    });

    it('sets the initial and current saved search to the persisted saved search', async () => {
      const title = 'My updated saved search';
      const persistedSavedSearch = {
        ...savedSearch,
        title,
      };
      const savedSearchContainer = getSavedSearchContainer({
        savedSearch: savedSearchMockWithTimeField,
        services: discoverServiceMock,
      });

      const result = await savedSearchContainer.persist(persistedSavedSearch, saveOptions);
      expect(savedSearchContainer.getInitial$().getValue().title).toBe(title);
      expect(savedSearchContainer.getCurrent$().getValue().title).toBe(title);
      expect(result).toEqual({ id: '123' });
    });

    it('emits false to the hasChanged$ BehaviorSubject', async () => {
      jest.mock('@kbn/saved-search-plugin/public', () => ({
        saveSavedSearch: jest.fn().mockResolvedValue({ id: '123' }),
      }));
      const savedSearchContainer = getSavedSearchContainer({
        savedSearch: savedSearchMockWithTimeField,
        services: discoverServiceMock,
      });

      await savedSearchContainer.persist(savedSearch, saveOptions);
      expect(savedSearchContainer.getHasChanged$().getValue()).toBe(false);
    });
  });
});
