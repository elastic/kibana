/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSavedSearchContainer } from './discover_saved_search_container';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { discoverServiceMock } from '../../../__mocks__/services';
import {
  createSavedSearchAdHocMock,
  createSavedSearchMock,
  savedSearchMock,
} from '../../../__mocks__/saved_search';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import {
  createInternalStateStore,
  createRuntimeStateManager,
  internalStateActions,
  selectTab,
} from './redux';
import { mockCustomizationContext } from '../../../customizations/__mocks__/customization_context';
import { omit } from 'lodash';
import { createTabsStorageManager } from './tabs_storage_manager';
import { DiscoverSearchSessionManager } from './discover_search_session';

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
    searchSessionManager: new DiscoverSearchSessionManager({
      history: services.history,
      session: services.data.search.session,
    }),
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

      expect({
        ...omit(initialSavedSearch, 'searchSource'),
        searchSource: initialSavedSearch.searchSource.serialize(),
      }).toEqual({
        ...omit(currentSavedSearch, 'searchSource'),
        searchSource: currentSavedSearch.searchSource.serialize(),
      });
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
