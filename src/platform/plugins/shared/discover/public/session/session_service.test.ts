/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  serializeDiscoverSession,
  deserializeDiscoverSession,
  type DiscoverSessionTagging,
  type DiscoverSession,
  type DiscoverSessionTab,
} from '@kbn/saved-search-plugin/common';
import type { SaveDiscoverSessionParams } from '@kbn/saved-search-plugin/public';
import { savedSearchPluginMock } from '@kbn/saved-search-plugin/public/mocks';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import {
  DataGridDensity,
  UnifiedHistogramSuggestionType,
  VIEW_MODE,
} from '@kbn/discover-session-constants';
import type { CombinedFilter } from '@kbn/es-query';
import { BooleanRelation, FILTERS, FilterStateStore } from '@kbn/es-query';
import { cloneDeep } from 'lodash';
import type { DiscoverSessionInternalResponse } from '../../server';
import {
  discoverSessionInternalDataSchema,
  discoverSessionInternalResponseSchema,
} from '../../server/api/internal_schema';
import type { DiscoverSessionClient, DiscoverSessionClientGetResult } from './api_client';
import { createSessionService } from './session_service';

const runtimeTab: DiscoverSessionTab = {
  id: 'logs-tab',
  label: 'Logs',
  sort: [],
  columns: [],
  grid: {},
  hideChart: false,
  hideTable: false,
  isTextBasedQuery: false,
  usesAdHocDataView: false,
  viewMode: VIEW_MODE.DOCUMENT_LEVEL,
  density: DataGridDensity.NORMAL,
  documentsDisplayMode: 'json',
  jsonModeSettings: { hideNulls: true, wrapLines: false, defaultRenderedNodes: 20 },
  serializedSearchSource: { index: 'logs-data-view' },
};

const apiData = serializeDiscoverSession({ title: 'Session', description: '', tabs: [runtimeTab] });

const tagging: DiscoverSessionTagging = {
  getTagIdsFromReferences: (references) =>
    references.filter(({ type }) => type === 'tag').map(({ id }) => id),
  updateTagsReferences: (references, tags) => [
    ...references.filter(({ type }) => type !== 'tag'),
    ...tags.map((id) => ({ type: 'tag', id, name: `tag-ref-${id}` })),
  ],
};

const apiResponse: DiscoverSessionInternalResponse = {
  id: 'session-id',
  data: apiData,
  meta: { managed: false },
};

const apiGetResponse: DiscoverSessionClientGetResult = {
  ...apiResponse,
  resolve: {
    outcome: 'conflict',
    aliasTargetId: 'other-session',
    aliasPurpose: 'savedObjectConversion',
  },
  warnings: [
    {
      type: 'dropped_property',
      tab_id: 'logs-tab',
      key: 'control_panels',
      message: 'Unable to transform control panels.',
    },
  ],
};

const session: SaveDiscoverSessionParams = {
  id: 'session-id',
  title: 'Session',
  description: '',
  tabs: [runtimeTab],
};
const persistedSession: DiscoverSession = {
  ...session,
  id: 'session-id',
  managed: false,
};

describe('Discover session service', () => {
  it('loads through REST with resolution metadata and warnings when the switch is enabled', async () => {
    const apiClient = createApiClient();
    const legacyClient = savedSearchPluginMock.createStartContract();
    const sessionService = createSessionService({
      apiClient,
      legacyClient,
      useHttpApi: true,
    });

    const loaded = await sessionService.get('session-id');

    expect(apiClient.get).toHaveBeenCalledWith('session-id');
    expect(apiClient.upsert).not.toHaveBeenCalled();
    expect(apiClient.create).not.toHaveBeenCalled();
    expect(legacyClient.getDiscoverSession).not.toHaveBeenCalled();
    expect(legacyClient.saveDiscoverSession).not.toHaveBeenCalled();
    expect(loaded.session.sharingSavedObjectProps).toEqual(apiGetResponse.resolve);
    expect(loaded.warnings).toEqual(apiGetResponse.warnings);
    expect(loaded.session).toEqual(
      expect.objectContaining({
        id: 'session-id',
        title: 'Session',
        tabs: [expect.objectContaining({ id: 'logs-tab', label: 'Logs' })],
      })
    );
  });

  it.each([
    {
      action: 'Save',
      copyOnSave: false,
      savedId: 'resolved-session-id',
      method: 'upsert' as const,
      unusedMethod: 'create' as const,
      idArgs: ['session-id'],
    },
    {
      action: 'Save As',
      copyOnSave: true,
      savedId: 'copied-session-id',
      method: 'create' as const,
      unusedMethod: 'upsert' as const,
      idArgs: [],
    },
  ])(
    'keeps the submitted tabs after $action and uses the returned identity and metadata',
    async ({ copyOnSave, savedId, method, unusedMethod, idArgs }) => {
      const { submittedSession, data } = createSaveFixture();
      const beforeSave = cloneDeep(submittedSession);
      const apiClient = createApiClient();
      const legacyClient = savedSearchPluginMock.createStartContract();
      // Save keeps the submitted tabs even when the response has different metadata.
      const saveResponse: DiscoverSessionInternalResponse = {
        id: savedId,
        data,
        meta: { managed: true },
      };
      apiClient.create.mockResolvedValue(saveResponse);
      apiClient.upsert.mockResolvedValue(saveResponse);
      const sessionService = createSessionService({
        apiClient,
        legacyClient,
        useHttpApi: true,
        tagging,
      });

      const savedSession = await sessionService.save(submittedSession, { copyOnSave });

      expect(apiClient[method]).toHaveBeenCalledTimes(1);
      expect(apiClient[method]).toHaveBeenCalledWith(...idArgs, data);
      expect(apiClient[unusedMethod]).not.toHaveBeenCalled();
      expect(legacyClient.saveDiscoverSession).not.toHaveBeenCalled();
      expect(savedSession).toStrictEqual({
        ...beforeSave,
        id: savedId,
        managed: true,
        references: data.references,
      });
      expect(savedSession?.tabs).toBe(submittedSession.tabs);
      expect(submittedSession).toStrictEqual(beforeSave);
      expect(apiClient.get).not.toHaveBeenCalled();
    }
  );

  it('creates a new session without an ID and keeps the submitted tabs', async () => {
    const { id: _id, ...newSession } = session;
    const apiClient = createApiClient();
    const sessionService = createSessionService({
      apiClient,
      legacyClient: savedSearchPluginMock.createStartContract(),
      useHttpApi: true,
    });

    const savedSession = await sessionService.save(newSession, {});

    expect(apiClient.create).toHaveBeenCalledWith(apiData);
    expect(apiClient.upsert).not.toHaveBeenCalled();
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(savedSession?.id).toBe(apiResponse.id);
    expect(savedSession?.tabs).toBe(newSession.tabs);
    expect(newSession).not.toHaveProperty('id');
  });

  it('uses the legacy client when the local switch is disabled', async () => {
    const apiClient = createApiClient();
    const legacyClient = savedSearchPluginMock.createStartContract();
    jest.mocked(legacyClient.getDiscoverSession).mockResolvedValue(persistedSession);
    jest.mocked(legacyClient.saveDiscoverSession).mockResolvedValue(persistedSession);
    const sessionService = createSessionService({
      apiClient,
      legacyClient,
      useHttpApi: false,
    });

    const loaded = await sessionService.get('session-id');
    const savedSession = await sessionService.save(session, { copyOnSave: false });

    expect(legacyClient.getDiscoverSession).toHaveBeenCalledWith('session-id');
    expect(legacyClient.saveDiscoverSession).toHaveBeenCalledWith(session, {
      copyOnSave: false,
    });
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.upsert).not.toHaveBeenCalled();
    expect(apiClient.create).not.toHaveBeenCalled();
    expect(loaded).toEqual({ session: persistedSession, warnings: [] });
    expect(savedSession).toBe(persistedSession);
  });

  it('preserves the stored session through CM to HTTP to CM, including shared and distinct IDs', async () => {
    const { submittedSession } = createSaveFixture();
    submittedSession.tabs.push({
      ...submittedSession.tabs[0],
      id: 'duplicate',
      label: 'Duplicate',
    });
    const stored = serializeDiscoverSession(submittedSession, tagging);
    const resolve = { outcome: 'exactMatch' } as const;
    const cmLoaded = deserializeDiscoverSession(
      {
        id: 'session-id',
        ...stored,
        managed: false,
        sharingSavedObjectProps: resolve,
      },
      tagging
    );
    const apiClient = createApiClient();
    const response = discoverSessionInternalResponseSchema.validate(
      JSON.parse(JSON.stringify({ id: cmLoaded.id, data: stored, meta: { managed: false } }))
    );
    expect(response.data).toEqual(stored);
    apiClient.get.mockResolvedValue({ ...response, resolve });
    apiClient.upsert.mockImplementation(async (id, data) => ({
      id,
      data: discoverSessionInternalDataSchema.validate(JSON.parse(JSON.stringify(data))),
      meta: { managed: false },
    }));
    const service = createSessionService({
      apiClient,
      legacyClient: savedSearchPluginMock.createStartContract(),
      useHttpApi: true,
      tagging,
    });

    const { session: httpLoaded, warnings } = await service.get(cmLoaded.id);
    expect(httpLoaded).toEqual(cmLoaded);
    expect(httpLoaded.tabs).toEqual(submittedSession.tabs);
    expect(warnings).toEqual([]);
    await service.save(httpLoaded, {});

    const { data: written }: DiscoverSessionInternalResponse = await apiClient.upsert.mock
      .results[0].value;
    const cmReloaded = deserializeDiscoverSession(
      {
        ...written,
        id: cmLoaded.id,
        managed: false,
        sharingSavedObjectProps: resolve,
      },
      tagging
    );
    expect(written).toEqual(stored);
    expect(cmReloaded).toEqual(cmLoaded);
  });
});

const createApiClient = (): jest.Mocked<DiscoverSessionClient> => ({
  create: jest.fn().mockResolvedValue(apiResponse),
  get: jest.fn().mockResolvedValue(apiGetResponse),
  upsert: jest.fn().mockResolvedValue(apiResponse),
});

const createSaveFixture = () => {
  const controlConfig = {
    variable_name: 'environment',
    variable_type: 'values',
    control_type: 'STATIC_VALUES',
    available_options: ['production', 'staging'],
    selected_options: ['production'],
    single_select: true,
  } satisfies OptionsListESQLControlState;
  const chartAttributes = {
    visualizationType: 'lnsXY',
    state: {
      datasourceStates: { textBased: { layers: { 'layer-1': { index: 'stored-esql-id' } } } },
      adHocDataViews: { 'stored-esql-id': { type: 'esql', timeFieldName: '@timestamp' } },
    },
  };

  const submittedSession: SaveDiscoverSessionParams = {
    ...session,
    tags: ['tag-1'],
    tabs: [
      // Identical specs may have different IDs after editing. Saving must keep both IDs.
      ...['inline-a', 'inline-b'].map((id): DiscoverSessionTab => {
        const combinedFilter: CombinedFilter = {
          meta: {
            index: `runtime-${id}`,
            type: FILTERS.COMBINED,
            relation: BooleanRelation.OR,
            params: [
              {
                meta: { index: `runtime-${id}`, type: FILTERS.CUSTOM },
                query: {
                  match_phrase: { message: { query: 'connection refused', slop: 2 } },
                },
              },
              {
                meta: { index: 'other-view', negate: true },
                query: { exists: { field: 'message' } },
              },
            ],
          },
          $state: { store: FilterStateStore.GLOBAL_STATE },
        };

        return {
          ...runtimeTab,
          id,
          label: id,
          usesAdHocDataView: true,
          serializedSearchSource: {
            index: {
              id: `runtime-${id}`,
              title: 'logs-*',
              timeFieldName: '@timestamp',
              sourceFilters: [{ value: 'secret.*' }],
              fieldFormats: {},
              runtimeFieldMap: {},
              fieldAttrs: {},
              allowNoIndex: false,
              allowHidden: false,
              managed: false,
            },
            filter: [combinedFilter, { meta: {}, query: { match_all: {} } }],
          },
        };
      }),
      {
        ...runtimeTab,
        id: 'esql',
        label: 'ES|QL',
        isTextBasedQuery: true,
        serializedSearchSource: { query: { esql: 'FROM logs-*' } },
        breakdownField: 'host.name',
        visContext: {
          suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
          attributes: chartAttributes,
          requestData: {
            dataViewId: 'live-esql-id',
            timeField: '@timestamp',
            breakdownField: 'host.name',
          },
        },
        controlGroupJson: JSON.stringify({
          last: {
            ...controlConfig,
            variable_name: 'last',
            type: ESQL_CONTROL,
            width: 'medium',
            grow: true,
            order: 2,
          },
          first: {
            ...controlConfig,
            variable_name: 'first',
            type: ESQL_CONTROL,
            width: 'medium',
            grow: true,
            order: 0,
          },
        }),
      },
    ],
  };

  const data = serializeDiscoverSession(submittedSession, tagging);

  return { submittedSession, data };
};
