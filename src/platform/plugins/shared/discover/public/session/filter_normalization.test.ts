/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FilterManager } from '@kbn/data-plugin/public';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { DiscoverTabType } from '@kbn/discover-session-constants';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { getDiscoverInternalStateMock } from '../__mocks__/discover_state.mock';
import { getPersistedTabMock } from '../application/main/state_management/redux/__mocks__/internal_state.mocks';
import {
  internalStateActions,
  selectHasUnsavedChanges,
} from '../application/main/state_management/redux';
import type { DiscoverSessionClient, DiscoverSessionGetResult } from './api_client';
import { createSessionService } from './session_service';

describe('filter normalization when loading a Discover session', () => {
  it.each([
    {
      path: 'legacy',
      useHttpApi: false,
      expectedApiCalls: [],
      expectedLegacyCalls: [['session-id']],
    },
    {
      path: 'HTTP',
      useHttpApi: true,
      expectedApiCalls: [['session-id']],
      expectedLegacyCalls: [],
    },
  ])(
    'does not mark a $path session as unsaved after initializing its filters',
    async ({ useHttpApi, expectedApiCalls, expectedLegacyCalls }) => {
      const services = createDiscoverServicesMock();
      const filterManager = new FilterManager(services.uiSettings);
      services.filterManager = filterManager;
      services.data.query.filterManager = filterManager;

      // Legacy saves receive filters that have already passed through the UI's FilterManager.
      filterManager.setAppFilters([
        {
          meta: { index: dataViewMock.id },
          query: { match_phrase: { extension: 'jpg' } },
        },
      ]);
      const originalFilters = filterManager.getAppFilters();
      const legacySession = createDiscoverSessionMock({
        id: 'session-id',
        tabs: [
          getPersistedTabMock({
            tabId: 'tab-id',
            dataView: dataViewMock,
            services,
            appStateOverrides: { filters: originalFilters },
          }),
        ],
      });
      filterManager.setAppFilters([]);

      const apiResponse: DiscoverSessionGetResult = {
        id: 'session-id',
        meta: { managed: false },
        resolve: { outcome: 'exactMatch' },
        data: {
          title: legacySession.title,
          description: legacySession.description,
          tabs: [
            {
              id: 'tab-id',
              label: 'Untitled',
              type: DiscoverTabType.Default,
              data_source: { type: 'data_view_reference', ref_id: 'the-data-view-id' },
              query: { language: 'kql', expression: '' },
              filters: [
                {
                  type: 'condition',
                  data_view_id: 'the-data-view-id',
                  disabled: false,
                  condition: { field: 'extension', operator: 'is', value: 'jpg' },
                },
              ],
              sort: [],
              column_order: ['default_column'],
              hide_chart: false,
              hide_table: false,
              view_mode: VIEW_MODE.DOCUMENT_LEVEL,
            },
          ],
        },
      };
      const apiClient: jest.Mocked<DiscoverSessionClient> = {
        get: jest.fn().mockResolvedValue(apiResponse),
        create: jest.fn(),
        upsert: jest.fn(),
      };
      const legacyGet = jest
        .spyOn(services.savedSearch, 'getDiscoverSession')
        .mockResolvedValue(legacySession);
      const sessionService = createSessionService({
        apiClient,
        legacyClient: services.savedSearch,
        useHttpApi,
      });
      services.sessionService = sessionService;
      const toolkit = getDiscoverInternalStateMock({
        services,
        persistedDataViews: [dataViewMock],
      });
      toolkit.internalState.dispatch(
        internalStateActions.setInitializationState({ hasESData: true, hasDataView: true })
      );
      await toolkit.internalState.dispatch(internalStateActions.loadDataViewList()).unwrap();
      await toolkit.internalState
        .dispatch(internalStateActions.initializeTabs({ discoverSessionId: 'session-id' }))
        .unwrap();
      await toolkit.initializeSingleTab({ tabId: 'tab-id' });

      expect(apiClient.get.mock.calls).toEqual(expectedApiCalls);
      expect(legacyGet.mock.calls).toEqual(expectedLegacyCalls);

      const filters = toolkit.getCurrentTab().appState.filters;
      expect(filters).toHaveLength(1);
      expect(filters?.[0].query).toEqual(originalFilters[0].query);
      expect(filters?.[0].meta.negate).toBe(false);
      expect(filters?.[0].meta.disabled).toBe(false);
      expect(
        selectHasUnsavedChanges(toolkit.internalState.getState(), {
          services,
          runtimeStateManager: toolkit.runtimeStateManager,
        })
      ).toEqual({ hasUnsavedChanges: false, unsavedTabIds: [] });
    }
  );
});
