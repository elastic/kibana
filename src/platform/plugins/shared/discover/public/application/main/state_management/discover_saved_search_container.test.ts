/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { fromTabStateToSavedObjectTab, internalStateActions } from './redux';
import { omit } from 'lodash';
import { getDiscoverInternalStateMock } from '../../../__mocks__/discover_state.mock';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import { getTabStateMock } from './redux/__mocks__/internal_state.mocks';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverServices } from '../../../build_services';
import { dataViewAdHoc } from '../../../__mocks__/data_view_complex';

describe('DiscoverSavedSearchContainer', () => {
  const setup = async ({
    persistedDiscoverSession,
    services,
  }: {
    persistedDiscoverSession?: DiscoverSession;
    services?: DiscoverServices;
  } = {}) => {
    const { internalState, initializeTabs, initializeSingleTab, getCurrentTab } =
      getDiscoverInternalStateMock({
        services,
        persistedDataViews: [dataViewWithTimefieldMock],
      });

    await initializeTabs({ persistedDiscoverSession });

    const { stateContainer } = await initializeSingleTab({ tabId: getCurrentTab().id });

    return { internalState, stateContainer, getCurrentTab };
  };

  const getPersistedDiscoverSession = ({ services }: { services: DiscoverServices }) => {
    const persistedTab = fromTabStateToSavedObjectTab({
      tab: getTabStateMock({
        id: 'persisted-tab',
        initialInternalState: {
          serializedSearchSource: { index: dataViewWithTimefieldMock.id },
        },
      }),
      overridenTimeRestore: false,
      services,
    });

    return createDiscoverSessionMock({
      id: 'test-id',
      tabs: [persistedTab],
    });
  };

  describe('set', () => {
    it('should update the current and initial state of the saved search', async () => {
      const {
        stateContainer: { savedSearchState },
      } = await setup();
      const newSavedSearch: SavedSearch = { ...savedSearchMock, title: 'New title' };
      const result = savedSearchState.set(newSavedSearch);

      expect(result).toBe(newSavedSearch);
      expect(savedSearchState.getState()).toBe(newSavedSearch);
      const initialSavedSearch = savedSearchState.getInitial$().getValue();
      const currentSavedSearch = savedSearchState.getCurrent$().getValue();

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
    it('should enable URL tracking for a persisted data view', async () => {
      const services = createDiscoverServicesMock();
      const { internalState, getCurrentTab } = await setup({ services });
      jest.spyOn(services.urlTracker, 'setTrackingEnabled').mockClear();
      expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
      internalState.dispatch(
        internalStateActions.setDataView({
          tabId: getCurrentTab().id,
          dataView: dataViewWithTimefieldMock,
        })
      );
      expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(true);
    });

    it('should disable URL tracking for an ad hoc data view', async () => {
      const services = createDiscoverServicesMock();
      const { internalState, getCurrentTab } = await setup({ services });
      jest.spyOn(services.urlTracker, 'setTrackingEnabled').mockClear();
      expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
      internalState.dispatch(
        internalStateActions.setDataView({
          tabId: getCurrentTab().id,
          dataView: dataViewAdHoc,
        })
      );
      expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(false);
    });

    it('should enable URL tracking if the ad hoc data view is a default profile data view', async () => {
      const services = createDiscoverServicesMock();
      const { internalState, getCurrentTab } = await setup({ services });
      jest.spyOn(services.urlTracker, 'setTrackingEnabled').mockClear();
      expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
      internalState.dispatch(internalStateActions.setDefaultProfileAdHocDataViews([dataViewAdHoc]));
      internalState.dispatch(
        internalStateActions.setDataView({
          tabId: getCurrentTab().id,
          dataView: dataViewAdHoc,
        })
      );
      expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(true);
    });

    it('should enable URL tracking with an ad hoc data view if in ES|QL mode', async () => {
      const services = createDiscoverServicesMock();
      const { internalState, getCurrentTab } = await setup({ services });
      jest.spyOn(services.urlTracker, 'setTrackingEnabled').mockClear();
      expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
      internalState.dispatch(
        internalStateActions.updateAppState({
          tabId: getCurrentTab().id,
          appState: { query: { esql: 'FROM test' } },
        })
      );
      expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(true);
    });

    it('should enable URL tracking with an ad hoc data view if the saved search has an ID (persisted)', async () => {
      const services = createDiscoverServicesMock();
      const { internalState, getCurrentTab } = await setup({
        persistedDiscoverSession: getPersistedDiscoverSession({ services }),
        services,
      });
      jest.spyOn(services.urlTracker, 'setTrackingEnabled').mockClear();
      expect(services.urlTracker.setTrackingEnabled).not.toHaveBeenCalled();
      internalState.dispatch(
        internalStateActions.setDataView({
          tabId: getCurrentTab().id,
          dataView: dataViewAdHoc,
        })
      );
      expect(services.urlTracker.setTrackingEnabled).toHaveBeenCalledWith(true);
    });
  });
});
