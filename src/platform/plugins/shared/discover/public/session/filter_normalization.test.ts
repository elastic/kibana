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
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { getDiscoverInternalStateMock } from '../__mocks__/discover_state.mock';
import {
  internalStateActions,
  selectHasUnsavedChanges,
} from '../application/main/state_management/redux';
import type { DiscoverSessionClient, DiscoverSessionClientGetResult } from './api_client';
import { createDiscoverSessionService } from './session_service';

describe('filter normalization when loading a Discover session', () => {
  it('does not mark a session as unsaved after initializing its filters', async () => {
    const services = createDiscoverServicesMock();
    const filterManager = new FilterManager(services.uiSettings);
    services.filterManager = filterManager;
    services.data.query.filterManager = filterManager;

    const apiResponse: DiscoverSessionClientGetResult = {
      id: 'session-id',
      meta: { managed: false },
      resolve: { outcome: 'exactMatch' },
      data: {
        title: 'Session',
        description: '',
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
    services.discoverSessionService = createDiscoverSessionService({ apiClient });
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

    expect(apiClient.get).toHaveBeenCalledWith('session-id');

    const filters = toolkit.getCurrentTab().appState.filters;
    expect(filters).toHaveLength(1);
    expect(filters?.[0].query).toStrictEqual({ match_phrase: { extension: 'jpg' } });
    expect(filters?.[0].meta.negate).toBe(false);
    expect(filters?.[0].meta.disabled).toBe(false);
    const unsavedChanges = selectHasUnsavedChanges(toolkit.internalState.getState(), {
      services,
      runtimeStateManager: toolkit.runtimeStateManager,
    });
    toolkit.internalState.dispatch(internalStateActions.disconnectTab({ tabId: 'tab-id' }));
    expect(unsavedChanges).toStrictEqual({ hasUnsavedChanges: false, unsavedTabIds: [] });
  });
});
