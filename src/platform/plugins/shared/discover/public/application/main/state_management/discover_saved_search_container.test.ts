/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSavedSearchContainer, isEqualSavedSearch } from './discover_saved_search_container';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { discoverServiceMock } from '../../../__mocks__/services';
import {
  createSavedSearchAdHocMock,
  createSavedSearchMock,
  savedSearchMock,
} from '../../../__mocks__/saved_search';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { dataViewComplexMock } from '../../../__mocks__/data_view_complex';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { VIEW_MODE } from '../../../../common/constants';
import { createSearchSourceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import {
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
  selectTab,
} from './redux';
import { mockCustomizationContext } from '../../../customizations/__mocks__/customization_context';
import { mockControlState } from '../../../__mocks__/esql_controls';
import { omit } from 'lodash';
import { createTabsStorageManager } from './tabs_storage_manager';

describe('DiscoverSavedSearchContainer', () => {
  const savedSearch = savedSearchMock;
  const services = discoverServiceMock;
  const urlStateStorage = createKbnUrlStateStorage();
  const tabsStorageManager = createTabsStorageManager({
    urlStateStorage,
    storage: services.storage,
  });
  const internalState = createInternalStateStore({
    services,
    customizationContext: mockCustomizationContext,
    runtimeStateManager: createRuntimeStateManager(),
    urlStateStorage,
    tabsStorageManager,
  });
  const getCurrentTab = () =>
    selectTab(internalState.getState(), internalState.getState().tabs.unsafeCurrentId);

  beforeAll(async () => {
    await internalState.dispatch(
      internalStateActions.initializeTabs({ discoverSessionId: savedSearch?.id })
    );
  });

  describe('getTitle', () => {
    it('returns undefined for new saved searches', () => {
      const container = getSavedSearchContainer({
        services,
        internalState,
        getCurrentTab,
      });
      expect(container.getTitle()).toBe(undefined);
    });

    it('returns the title of a persisted saved searches', () => {
      const container = getSavedSearchContainer({
        services,
        internalState,
        getCurrentTab,
      });
      container.set(savedSearch);
      expect(container.getTitle()).toBe(savedSearch.title);
    });
  });

  describe('set', () => {
    it('should update the current and initial state of the saved search', () => {
      const container = getSavedSearchContainer({
        services,
        internalState,
        getCurrentTab,
      });
      const newSavedSearch: SavedSearch = { ...savedSearch, title: 'New title' };
      const result = container.set(newSavedSearch);

      expect(result).toBe(newSavedSearch);
      expect(container.getState()).toBe(newSavedSearch);
      const initialSavedSearch = container.getInitial$().getValue();
      const currentSavedSearch = container.getCurrent$().getValue();

      expect(isEqualSavedSearch(initialSavedSearch, currentSavedSearch)).toBeTruthy();
    });

    it('should reset hasChanged$ to false', () => {
      const container = getSavedSearchContainer({
        services,
        internalState,
        getCurrentTab,
      });
      const newSavedSearch: SavedSearch = { ...savedSearch, title: 'New title' };

      container.set(newSavedSearch);
      expect(container.getHasChanged$().getValue()).toBe(false);
    });
  });

  describe('update', () => {
    it('updates a saved search by app state providing hideChart', async () => {
      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        internalState,
        getCurrentTab,
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
        internalState,
        getCurrentTab,
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

  describe('isEqualSavedSearch', () => {
    it('should return true for equal saved searches', () => {
      const savedSearch1 = savedSearchMock;
      const savedSearch2 = { ...savedSearchMock };
      expect(isEqualSavedSearch(savedSearch1, savedSearch2)).toBe(true);
    });

    it('should return false for different saved searches', () => {
      const savedSearch1 = savedSearchMock;
      const savedSearch2 = { ...savedSearchMock, title: 'New title' };
      expect(isEqualSavedSearch(savedSearch1, savedSearch2)).toBe(false);
    });

    it('should return true for saved searches with equal default values of viewMode and false otherwise', () => {
      const savedSearch1 = { ...savedSearchMock, viewMode: undefined };
      const savedSearch2 = { ...savedSearchMock, viewMode: VIEW_MODE.DOCUMENT_LEVEL };
      const savedSearch3 = { ...savedSearchMock, viewMode: VIEW_MODE.AGGREGATED_LEVEL };
      expect(isEqualSavedSearch(savedSearch1, savedSearch2)).toBe(true);
      expect(isEqualSavedSearch(savedSearch2, savedSearch1)).toBe(true);
      expect(isEqualSavedSearch(savedSearch1, savedSearch3)).toBe(false);
      expect(isEqualSavedSearch(savedSearch2, savedSearch3)).toBe(false);
    });

    it('should return true for saved searches with equal default values of breakdownField and false otherwise', () => {
      const savedSearch1 = { ...savedSearchMock, breakdownField: undefined };
      const savedSearch2 = { ...savedSearchMock, breakdownField: '' };
      const savedSearch3 = { ...savedSearchMock, breakdownField: 'test' };
      expect(isEqualSavedSearch(savedSearch1, savedSearch2)).toBe(true);
      expect(isEqualSavedSearch(savedSearch2, savedSearch1)).toBe(true);
      expect(isEqualSavedSearch(savedSearch1, savedSearch3)).toBe(false);
      expect(isEqualSavedSearch(savedSearch2, savedSearch3)).toBe(false);
    });

    it('should check searchSource fields', () => {
      const savedSearch1 = {
        ...savedSearchMock,
        searchSource: createSearchSourceMock({
          index: savedSearchMock.searchSource.getField('index'),
        }),
      };
      const savedSearch2 = {
        ...savedSearchMock,
        searchSource: createSearchSourceMock({
          index: savedSearchMock.searchSource.getField('index'),
        }),
      };
      expect(isEqualSavedSearch(savedSearch1, savedSearch1)).toBe(true);
      expect(isEqualSavedSearch(savedSearch1, savedSearch2)).toBe(true);
      savedSearch2.searchSource.setField('query', { language: 'lucene', query: 'test' });
      expect(isEqualSavedSearch(savedSearch1, savedSearch2)).toBe(false);
    });

    it('should return false for different control states', () => {
      const savedSearch1 = {
        ...savedSearchMock,
        controlGroupState: {
          ...mockControlState,
          panel1: { ...mockControlState.panel1, selectedOptions: ['baz'] },
        },
      };
      const savedSearch2 = { ...savedSearchMock, controlGroupState: mockControlState };
      expect(isEqualSavedSearch(savedSearch1, savedSearch2)).toBe(false);
    });
  });

  describe('URL tracking', () => {
    it('should enable URL tracking for a persisted data view', () => {
      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        internalState,
        getCurrentTab,
      });
      const unsubscribe = savedSearchContainer.initUrlTracking();
      jest.spyOn(services.urlTracker, 'setTrackingEnabled').mockClear();
      expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
      const currentSavedSearch = omit(createSavedSearchMock(), 'id');
      savedSearchContainer.set(currentSavedSearch);
      expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(true);
      unsubscribe();
    });

    it('should disable URL tracking for an ad hoc data view', () => {
      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        internalState,
        getCurrentTab,
      });
      const unsubscribe = savedSearchContainer.initUrlTracking();
      jest.spyOn(services.urlTracker, 'setTrackingEnabled').mockClear();
      expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
      const currentSavedSearch = omit(createSavedSearchAdHocMock(), 'id');
      savedSearchContainer.set(currentSavedSearch);
      expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(false);
      unsubscribe();
    });

    it('should enable URL tracking if the ad hoc data view is a default profile data view', () => {
      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        internalState,
        getCurrentTab,
      });
      const unsubscribe = savedSearchContainer.initUrlTracking();
      jest.spyOn(services.urlTracker, 'setTrackingEnabled').mockClear();
      expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
      const currentSavedSearch = omit(createSavedSearchAdHocMock(), 'id');
      internalState.dispatch(
        internalStateActions.setDefaultProfileAdHocDataViews([
          currentSavedSearch.searchSource.getField('index')!,
        ])
      );
      savedSearchContainer.set(currentSavedSearch);
      expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(true);
      unsubscribe();
    });

    it('should enable URL tracking with an ad hoc data view if in ES|QL mode', () => {
      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        internalState,
        getCurrentTab,
      });
      const unsubscribe = savedSearchContainer.initUrlTracking();
      jest.spyOn(services.urlTracker, 'setTrackingEnabled').mockClear();
      expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
      const currentSavedSearch = omit(createSavedSearchAdHocMock(), 'id');
      currentSavedSearch.searchSource.setField('query', { esql: 'FROM test' });
      savedSearchContainer.set(currentSavedSearch);
      expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(true);
      unsubscribe();
    });

    it('should enable URL tracking with an ad hoc data view if the saved search has an ID (persisted)', () => {
      const savedSearchContainer = getSavedSearchContainer({
        services: discoverServiceMock,
        internalState,
        getCurrentTab,
      });
      const unsubscribe = savedSearchContainer.initUrlTracking();
      jest.spyOn(services.urlTracker, 'setTrackingEnabled').mockClear();
      expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
      const currentSavedSearch = createSavedSearchAdHocMock();
      savedSearchContainer.set(currentSavedSearch);
      expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(true);
      unsubscribe();
    });
  });
});
