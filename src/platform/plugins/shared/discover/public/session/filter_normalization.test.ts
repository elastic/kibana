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
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { getDiscoverInternalStateMock } from '../__mocks__/discover_state.mock';
import { getPersistedTabMock } from '../application/main/state_management/redux/__mocks__/internal_state.mocks';
import { selectHasUnsavedChanges } from '../application/main/state_management/redux';
import type { DiscoverSessionClient } from './api_client';
import { createDiscoverSessionPersistence } from './persistence';

describe('filter normalization when loading a Discover session', () => {
  it.each([
    { path: 'legacy', useHttpApi: false },
    { path: 'HTTP', useHttpApi: true },
  ])(
    'does not mark a $path session as unsaved after initializing its filters',
    async ({ useHttpApi }) => {
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

      const apiResponse: Awaited<ReturnType<DiscoverSessionClient['get']>> = {
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
      jest.spyOn(services.savedSearch, 'getDiscoverSession').mockResolvedValue(legacySession);
      const persistence = createDiscoverSessionPersistence({
        apiClient,
        legacyClient: services.savedSearch,
        useHttpApi,
      });
      const { session } = await persistence.get('session-id');
      const toolkit = getDiscoverInternalStateMock({
        services,
        persistedDataViews: [dataViewMock],
      });
      await toolkit.initializeTabs({ persistedDiscoverSession: session });
      await toolkit.initializeSingleTab({ tabId: 'tab-id' });

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
