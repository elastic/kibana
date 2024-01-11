/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSavedSearchContainer, isEqualSavedSearch } from './discover_saved_search_container';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock, savedSearchMockWithTimeField } from '../../../__mocks__/saved_search';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { dataViewComplexMock } from '../../../__mocks__/data_view_complex';
import { getDiscoverGlobalStateContainer } from './discover_global_state_container';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

describe('DiscoverSavedSearchContainer', () => {
  const savedSearch = savedSearchMock;
  const services = discoverServiceMock;
  const globalStateContainer = getDiscoverGlobalStateContainer(createKbnUrlStateStorage());

  describe('getTitle', () => {
    it('returns undefined for new saved searches', () => {
      const container = getSavedSearchContainer({ services, globalStateContainer });
      expect(container.getTitle()).toBe(undefined);
    });

    it('returns the title of a persisted saved searches', () => {
      const container = getSavedSearchContainer({ services, globalStateContainer });
      container.set(savedSearch);
      expect(container.getTitle()).toBe(savedSearch.title);
    });
  });

  describe('set', () => {
    it('should update the current and initial state of the saved search', () => {
      const container = getSavedSearchContainer({ services, globalStateContainer });
      const newSavedSearch: SavedSearch = { ...savedSearch, title: 'New title' };
      const result = container.set(newSavedSearch);

      expect(result).toBe(newSavedSearch);
      expect(container.getState()).toBe(newSavedSearch);
      const initialSavedSearch = container.getInitial$().getValue();
      const currentSavedSearch = container.getCurrent$().getValue();

      expect(isEqualSavedSearch(initialSavedSearch, currentSavedSearch)).toBeTruthy();
    });

    it('should reset hasChanged$ to false', () => {
      const container = getSavedSearchContainer({ services, globalStateContainer });
      const newSavedSearch: SavedSearch = { ...savedSearch, title: 'New title' };

      container.set(newSavedSearch);
      expect(container.getHasChanged$().getValue()).toBe(false);
    });
  });

  describe('new', () => {
    it('should create a new saved search', async () => {
      const container = getSavedSearchContainer({ services, globalStateContainer });
      const result = await container.new(dataViewMock);

      expect(result.title).toBeUndefined();
      expect(result.id).toBeUndefined();
      const savedSearchState = container.getState();
      expect(savedSearchState.id).not.toEqual(savedSearch.id);
      expect(savedSearchState.searchSource.getField('index')).toEqual(
        savedSearch.searchSource.getField('index')
      );
    });

    it('should create a new saved search with provided DataView', async () => {
      const container = getSavedSearchContainer({ services, globalStateContainer });
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
    discoverServiceMock.savedSearch.get = jest.fn().mockReturnValue(savedSearchMock);

    it('loads a saved search', async () => {
      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        globalStateContainer,
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
        services: discoverServiceMock,
        globalStateContainer,
      });
      const savedSearchToPersist = {
        ...savedSearchMockWithTimeField,
        title: 'My updated saved search',
      };

      await savedSearchContainer.persist(savedSearchToPersist, saveOptions);
      expect(discoverServiceMock.savedSearch.save).toHaveBeenCalledWith(
        savedSearchToPersist,
        saveOptions
      );
    });

    it('sets the initial and current saved search to the persisted saved search', async () => {
      const title = 'My updated saved search';
      const persistedSavedSearch = {
        ...savedSearch,
        title,
      };

      discoverServiceMock.savedSearch.save = jest.fn().mockResolvedValue('123');

      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        globalStateContainer,
      });

      const result = await savedSearchContainer.persist(persistedSavedSearch, saveOptions);
      expect(savedSearchContainer.getInitial$().getValue().title).toBe(title);
      expect(savedSearchContainer.getCurrent$().getValue().title).toBe(title);
      expect(result).toEqual({ id: '123' });
    });

    it('emits false to the hasChanged$ BehaviorSubject', async () => {
      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        globalStateContainer,
      });
      const savedSearchToPersist = {
        ...savedSearchMockWithTimeField,
        title: 'My updated saved search',
      };

      await savedSearchContainer.persist(savedSearchToPersist, saveOptions);
      expect(savedSearchContainer.getHasChanged$().getValue()).toBe(false);
    });

    it('takes care of persisting timeRestore correctly ', async () => {
      discoverServiceMock.timefilter.getTime = jest.fn(() => ({ from: 'now-15m', to: 'now' }));
      discoverServiceMock.timefilter.getRefreshInterval = jest.fn(() => ({
        value: 0,
        pause: true,
      }));
      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        globalStateContainer,
      });
      const savedSearchToPersist = {
        ...savedSearchMockWithTimeField,
        title: 'My updated saved search',
        timeRestore: true,
      };
      await savedSearchContainer.persist(savedSearchToPersist, saveOptions);
      expect(discoverServiceMock.timefilter.getTime).toHaveBeenCalled();
      expect(discoverServiceMock.timefilter.getRefreshInterval).toHaveBeenCalled();
      expect(savedSearchToPersist.timeRange).toEqual({ from: 'now-15m', to: 'now' });
      expect(savedSearchToPersist.refreshInterval).toEqual({
        value: 0,
        pause: true,
      });
    });

    it('Error thrown on persistence layer bubbling up, no changes to the initial saved search ', async () => {
      discoverServiceMock.savedSearch.save = jest.fn().mockImplementation(() => {
        throw new Error('oh-noes');
      });

      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        globalStateContainer,
      });
      savedSearchContainer.set(savedSearch);
      savedSearchContainer.update({ nextState: { hideChart: true } });
      expect(savedSearchContainer.getHasChanged$().getValue()).toBe(true);
      try {
        await savedSearchContainer.persist(savedSearch, saveOptions);
      } catch (e) {
        // intentional error
      }
      expect(savedSearchContainer.getHasChanged$().getValue()).toBe(true);
      expect(savedSearchContainer.getInitial$().getValue().title).not.toBe(
        'My updated saved search'
      );
    });
  });

  describe('update', () => {
    it('updates a saved search by app state providing hideChart', async () => {
      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        globalStateContainer,
      });
      savedSearchContainer.set(savedSearch);
      const updated = savedSearchContainer.update({ nextState: { hideChart: true } });
      expect(savedSearchContainer.getHasChanged$().getValue()).toBe(true);
      savedSearchContainer.set(updated);
      expect(savedSearchContainer.getHasChanged$().getValue()).toBe(false);
      savedSearchContainer.update({ nextState: { hideChart: false } });
      expect(savedSearchContainer.getHasChanged$().getValue()).toBe(true);
      savedSearchContainer.update({ nextState: { hideChart: true } });
      expect(savedSearchContainer.getHasChanged$().getValue()).toBe(false);
    });
    it('updates a saved search by data view', async () => {
      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        globalStateContainer,
      });
      const updated = savedSearchContainer.update({ nextDataView: dataViewMock });
      expect(savedSearchContainer.getHasChanged$().getValue()).toBe(true);
      savedSearchContainer.set(updated);
      expect(savedSearchContainer.getHasChanged$().getValue()).toBe(false);
      savedSearchContainer.update({ nextDataView: dataViewComplexMock });
      expect(savedSearchContainer.getHasChanged$().getValue()).toBe(true);
      savedSearchContainer.update({ nextDataView: dataViewMock });
      expect(savedSearchContainer.getHasChanged$().getValue()).toBe(false);
    });
  });
});
