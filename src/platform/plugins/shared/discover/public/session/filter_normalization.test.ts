/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FilterManager } from '@kbn/data-plugin/public';
import type { CombinedFilter } from '@kbn/es-query';
import { BooleanRelation, FILTERS } from '@kbn/es-query';
import {
  deserializeDiscoverSession,
  serializeDiscoverSession,
  VIEW_MODE,
} from '@kbn/saved-search-plugin/common';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DataView } from '@kbn/data-views-plugin/common';
import { DiscoverTabType } from '@kbn/discover-session-constants';
import { cloneDeep } from 'lodash';
import { map } from 'rxjs';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { getDiscoverInternalStateMock } from '../__mocks__/discover_state.mock';
import { getPersistedTabMock } from '../application/main/state_management/redux/__mocks__/internal_state.mocks';
import {
  internalStateActions,
  selectHasUnsavedChanges,
  selectTab,
  selectTabRuntimeState,
  TabInitializationStatus,
} from '../application/main/state_management/redux';
import { getInlineDataView } from '../../common/session/inline_data_view';
import { assignStoredInlineDataViewIds } from '../../server/api/transforms/assign_stored_inline_data_view_ids';
import { transformDiscoverSessionIn } from '../../server/api/transforms/transform_discover_session_in';
import type { DiscoverSessionClient, DiscoverSessionClientGetResult } from './api_client';
import { createSessionService } from './session_service';

describe('filter normalization when loading a Discover session', () => {
  it.each(
    ['CM', 'public API'].flatMap((source) => [
      {
        source,
        path: 'CM',
        useHttpApi: false,
        expectedApiCalls: [],
        expectedLegacyCalls: [['session-id']],
      },
      {
        source,
        path: 'HTTP',
        useHttpApi: true,
        expectedApiCalls: [['session-id']],
        expectedLegacyCalls: [],
      },
    ])
  )(
    'preserves untouched tabs and detects only real edits after loading a $source-created session through $path',
    async ({ source, useHttpApi, expectedApiCalls, expectedLegacyCalls }) => {
      const services = createDiscoverServicesMock();
      const filterManager = new FilterManager(services.uiSettings);
      services.filterManager = filterManager;
      services.data.query.filterManager = filterManager;
      services.data.query.state$ = filterManager.getUpdates$().pipe(
        map(() => ({
          state: { filters: filterManager.getFilters() },
          changes: { filters: true, appFilters: true, globalFilters: true },
        }))
      );

      // Legacy saves receive filters that have already passed through the UI's FilterManager.
      filterManager.setAppFilters([
        {
          meta: { index: dataViewMock.id },
          query: { match_phrase: { extension: 'jpg' } },
        },
        {
          meta: { index: 'other-data-view', negate: true },
          query: { match_phrase: { extension: 'png' } },
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

      const publicCreateData = transformDiscoverSessionIn({
        title: 'Public API session',
        description: '',
        tabs: [
          {
            id: 'tab-id',
            label: 'Logs',
            type: DiscoverTabType.Default,
            data_source: { type: 'data_view_spec', index_pattern: 'logs-*' },
            query: { language: 'kql', expression: '' },
            sort: [],
            column_order: [],
            view_mode: VIEW_MODE.DOCUMENT_LEVEL,
            hide_chart: true,
            hide_table: false,
            filters: [
              {
                type: 'condition',
                condition: { field: 'extension', operator: 'is', value: 'jpg' },
              },
              {
                type: 'condition',
                condition: { field: 'extension', operator: 'is', value: 'png', negate: true },
                data_view_id: 'other-data-view',
              },
            ],
          },
        ],
      });
      const apiResponse: DiscoverSessionClientGetResult = {
        id: 'session-id',
        meta: { managed: false },
        resolve: { outcome: 'exactMatch' },
        data:
          source === 'public API'
            ? {
                attributes: assignStoredInlineDataViewIds(publicCreateData.attributes),
                references: publicCreateData.references,
              }
            : serializeDiscoverSession(legacySession),
      };
      const unopenedFilter: CombinedFilter = {
        meta: {
          type: FILTERS.COMBINED,
          relation: BooleanRelation.OR,
          params: [
            {
              meta: { type: FILTERS.CUSTOM },
              query: { match_phrase: { extension: { query: 'jpg', slop: 2 } } },
            },
            {
              meta: { index: 'other-data-view', negate: true },
              query: { exists: { field: 'extension' } },
            },
          ],
        },
      };
      const unopenedTab = getPersistedTabMock({
        tabId: 'unopened-tab',
        dataView: dataViewMock,
        services,
        appStateOverrides: { filters: [unopenedFilter] },
      });
      const storedUnopenedTab = serializeDiscoverSession({ ...legacySession, tabs: [unopenedTab] });
      apiResponse.data.attributes.tabs.push(...storedUnopenedTab.attributes.tabs);
      apiResponse.data.references.push(...storedUnopenedTab.references);
      const cmSession = deserializeDiscoverSession({ id: legacySession.id, ...apiResponse.data });
      const originalCmSession = cloneDeep(cmSession);
      const originalApiResponse = cloneDeep(apiResponse);
      const expectedDataViewId =
        source === 'public API'
          ? getInlineDataView(cmSession.tabs[0].serializedSearchSource)?.id
          : dataViewMock.id;
      expect(expectedDataViewId).toEqual(expect.any(String));
      if (source === 'public API') {
        expect(cmSession.tabs[0].serializedSearchSource.filter?.[0].meta.negate).toBeUndefined();
        expect(cmSession.tabs[0].serializedSearchSource.filter?.[0].meta.disabled).toBeUndefined();
      }
      const apiClient: jest.Mocked<DiscoverSessionClient> = {
        get: jest.fn().mockResolvedValue(apiResponse),
        create: jest.fn(),
        upsert: jest.fn(async (id, data) => ({ id, data, meta: { managed: false } })),
      };
      const legacyGet = jest
        .spyOn(services.savedSearch, 'getDiscoverSession')
        .mockResolvedValue(cmSession);
      jest
        .spyOn(services.savedSearch, 'saveDiscoverSession')
        .mockImplementation(async (submitted) => ({
          ...submitted,
          id: 'session-id',
          managed: false,
        }));
      const sessionService = createSessionService({
        apiClient,
        legacyClient: services.savedSearch,
        useHttpApi,
      });
      services.sessionService = sessionService;
      const save = jest.spyOn(sessionService, 'save');
      const toolkit = getDiscoverInternalStateMock({
        services,
        persistedDataViews: [dataViewMock],
      });
      jest.spyOn(services.dataViews, 'create').mockImplementation(async (spec) => {
        return new DataView({ spec, fieldFormats: services.fieldFormats });
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
      expect(apiResponse).toEqual(originalApiResponse);
      expect(cmSession).toEqual(originalCmSession);
      expect(
        selectTabRuntimeState(toolkit.runtimeStateManager, 'tab-id').currentDataView$.getValue()?.id
      ).toBe(expectedDataViewId);

      const filters = toolkit.getCurrentTab().appState.filters;
      const expectedFilters = [
        {
          query: originalFilters[0].query,
          meta: { index: expectedDataViewId, negate: false, disabled: false },
        },
        {
          query: originalFilters[1].query,
          meta: { index: 'other-data-view', negate: true, disabled: false },
        },
      ];
      expect(filters).toMatchObject(expectedFilters);
      expect(filterManager.getFilters()).toMatchObject(expectedFilters);
      expect(
        selectHasUnsavedChanges(toolkit.internalState.getState(), {
          services,
          runtimeStateManager: toolkit.runtimeStateManager,
        })
      ).toEqual({ hasUnsavedChanges: false, unsavedTabIds: [] });
      expect(toolkit.internalState.getState().persistedDiscoverSession?.tabs).toEqual(
        cmSession.tabs
      );
      expect(
        selectTab(toolkit.internalState.getState(), unopenedTab.id).initializationState
          .initializationStatus
      ).toBe(TabInitializationStatus.NotStarted);

      const editedFilters = cloneDeep(filterManager.getAppFilters());
      editedFilters[0].query = { match_phrase: { extension: { query: 'jpg', slop: 2 } } };
      filterManager.setAppFilters(editedFilters);
      const expectedEditedFilters = filterManager.getAppFilters();
      expect(expectedEditedFilters[0].query).toEqual(editedFilters[0].query);
      expect(
        selectHasUnsavedChanges(toolkit.internalState.getState(), {
          services,
          runtimeStateManager: toolkit.runtimeStateManager,
        })
      ).toEqual({ hasUnsavedChanges: true, unsavedTabIds: ['tab-id'] });
      expect(toolkit.internalState.getState().persistedDiscoverSession?.tabs).toEqual(
        cmSession.tabs
      );

      await toolkit.internalState
        .dispatch(
          internalStateActions.saveDiscoverSession({
            newTitle: cmSession.title,
            newDescription: cmSession.description,
            newTags: [],
            newTimeRestore: false,
            newCopyOnSave: false,
          })
        )
        .unwrap();

      expect(save).toHaveBeenCalledTimes(1);
      const [submitted] = save.mock.calls[0];
      expect(
        submitted.tabs.find(({ id }) => id === 'tab-id')?.serializedSearchSource.filter
      ).toEqual(expectedEditedFilters);
      expect(
        submitted.tabs.find(({ id }) => id === unopenedTab.id)?.serializedSearchSource
      ).toStrictEqual(originalCmSession.tabs[1].serializedSearchSource);
      expect(cmSession).toEqual(originalCmSession);
      expect(apiResponse).toEqual(originalApiResponse);
      toolkit.internalState.dispatch(internalStateActions.disconnectTab({ tabId: 'tab-id' }));
    }
  );
});
