/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSavedSearchContainer } from './discover_saved_search_container';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock } from '../../../__mocks__/saved_search';
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
      expect(container.getInitial$().getValue()).toBe(newSavedSearch);
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
    });

    it('should create a new saved search with provided AppState', async () => {
      const container = getSavedSearchContainer({ savedSearch, services });
      const appState = { columns: ['test'] };
      const result = await container.new(undefined, appState);
      expect(result.columns).toEqual(['test']);
      expect(container.getHasChanged$().getValue()).toEqual(true);
    });
  });
});
