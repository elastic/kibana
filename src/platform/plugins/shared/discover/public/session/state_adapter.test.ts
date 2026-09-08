/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CONTROL_WIDTH_MEDIUM,
  DEFAULT_PINNED_CONTROL_STATE,
  ESQL_CONTROL,
} from '@kbn/controls-constants';
import { DataGridDensity, UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
import { FilterStateStore, updateFilterReferences } from '@kbn/es-query';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type { SaveDiscoverSessionParams } from '@kbn/saved-search-plugin/public';
import { savedSearchPluginMock } from '@kbn/saved-search-plugin/public/mocks';
import { cloneDeep } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { prepareDiscoverSession } from './prepare_session';
import { createDiscoverSessionPersistence } from './persistence';
import {
  fromDiscoverSessionApiResponse,
  getDiscoverSessionReferences,
  toDiscoverSessionApiData,
} from './state_adapter';

type ApiResponse = Parameters<typeof fromDiscoverSessionApiResponse>[0];
type ApiTab = ApiResponse['data']['tabs'][number];
type ApiClassicTab = Exclude<ApiTab, { data_source: { type: 'esql' } }>;
type ApiEsqlTab = Extract<ApiTab, { data_source: { type: 'esql' } }>;
type ApiInlineDataView = Extract<ApiClassicTab['data_source'], { type: 'data_view_spec' }>;

jest.mock('uuid', () => ({ v4: jest.fn(() => 'runtime-inline-id') }));

const mockedUuidv4 = uuidv4 as jest.MockedFunction<() => string>;

const inlineApiDataView: ApiInlineDataView = {
  type: 'data_view_spec',
  name: 'Inline logs',
  index_pattern: 'logs-*',
  time_field: '@timestamp',
  field_filters: ['secret.*'],
};

const changedInlineDataView: ApiInlineDataView = {
  ...inlineApiDataView,
  field_filters: ['private.*'],
};

const inlineApiTab: ApiClassicTab = {
  id: 'classic-inline',
  label: 'Inline',
  sort: [],
  column_order: [],
  filters: [
    {
      type: 'dsl',
      dsl: { query: { match_all: {} } },
    },
    {
      type: 'dsl',
      dsl: { query: { term: { 'service.name': 'api' } } },
      data_view_id: 'foreign-data-view-id',
    },
  ],
  data_source: inlineApiDataView,
  view_mode: VIEW_MODE.DOCUMENT_LEVEL,
  hide_chart: true,
  hide_table: false,
};

const response: ApiResponse = {
  id: 'session-id',
  data: {
    title: 'Operations',
    description: 'Operational logs',
    tags: ['tag-1'],
    tabs: [
      {
        id: 'classic-ref',
        label: 'Referenced',
        sort: [{ name: '@timestamp', direction: 'desc' }],
        column_order: ['message'],
        query: { language: 'kql', expression: 'status: 200' },
        filters: [],
        data_source: { type: 'data_view_reference', ref_id: 'logs-data-view' },
        view_mode: VIEW_MODE.DOCUMENT_LEVEL,
        hide_chart: false,
        hide_table: false,
      },
      inlineApiTab,
      {
        id: 'esql',
        label: 'ES|QL',
        sort: [{ name: '@timestamp', direction: 'asc' }],
        column_order: ['@timestamp', 'message'],
        column_settings: { message: { width: 320 } },
        data_source: { type: 'esql', query: 'FROM logs-* | WHERE status == 500' },
        hide_chart: false,
        hide_table: false,
        hide_aggregated_preview: true,
        row_height: 2,
        header_row_height: 'auto',
        rows_per_page: 25,
        sample_size: 500,
        breakdown_field: 'service.name',
        chart_interval: 'h',
        time_range: { from: 'now-24h', to: 'now' },
        refresh_interval: { pause: false, value: 30_000 },
        density: DataGridDensity.COMPACT,
        documents_display_mode: 'json',
        json_mode_settings: { hide_nulls: true, wrap_lines: false },
        esql_approximation: true,
        vis_context: {
          suggestion_type: UnifiedHistogramSuggestionType.histogramForESQL,
          attributes: {
            visualizationType: 'lnsXY',
            state: {
              datasourceStates: {
                textBased: {
                  layers: {
                    'layer-1': { index: 'esql-data-view' },
                  },
                },
              },
              adHocDataViews: {
                'esql-data-view': {
                  id: 'esql-data-view',
                  title: 'logs-*',
                  type: 'esql',
                  timeFieldName: '@timestamp',
                },
              },
            },
          },
        },
        control_panels: [
          {
            id: 'service-control',
            type: ESQL_CONTROL,
            width: CONTROL_WIDTH_MEDIUM,
            grow: DEFAULT_PINNED_CONTROL_STATE.grow,
            config: {
              control_type: 'STATIC_VALUES',
              available_options: ['api', 'web'],
              selected_options: ['api'],
              single_select: true,
              variable_name: 'service',
              variable_type: 'values',
              title: 'Service',
            },
          },
        ],
      },
    ],
  },
  meta: { managed: true },
};

const createInlineTabsResponse = (
  dataSources: [ApiInlineDataView, ApiInlineDataView] = [inlineApiDataView, inlineApiDataView]
): ApiResponse => {
  return {
    ...response,
    data: {
      ...response.data,
      tabs: [
        { ...inlineApiTab, id: 'inline-a', label: 'Inline A', data_source: dataSources[0] },
        { ...inlineApiTab, id: 'inline-b', label: 'Inline B', data_source: dataSources[1] },
      ],
    },
  };
};

describe('Discover session conversion and UI preparation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('converts API fields without assigning inline IDs or binding filters', () => {
    const originalResponse = cloneDeep(response);

    const session = fromDiscoverSessionApiResponse(response);

    expect(session.tabs[0].visContext).toBeUndefined();
    expect(session.tabs[2].visContext).toStrictEqual({
      suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
      attributes: response.data.tabs[2].vis_context?.attributes,
      requestData: {
        dataViewId: 'esql-data-view',
        timeField: '@timestamp',
        breakdownField: 'service.name',
      },
    });
    expect(session.tabs[1].serializedSearchSource.index).not.toHaveProperty('id');
    expect(session.tabs[1].serializedSearchSource.filter?.[0].meta.index).toBeUndefined();
    expect(session.tabs[1].serializedSearchSource.filter?.[1].meta.index).toBe(
      'foreign-data-view-id'
    );
    expect(fromDiscoverSessionApiResponse(response)).toStrictEqual(session);
    expect(mockedUuidv4).not.toHaveBeenCalled();
    expect(response).toStrictEqual(originalResponse);
  });

  it('prepares classic, inline, and ES|QL tabs for the UI', () => {
    const session = prepareDiscoverSession(response);

    expect(session).toEqual(
      expect.objectContaining({
        id: 'session-id',
        title: 'Operations',
        description: 'Operational logs',
        tags: ['tag-1'],
        managed: true,
      })
    );
    expect(session.tabs).toHaveLength(3);
    expect(session.tabs[0].serializedSearchSource.index).toBe('logs-data-view');
    expect(session.tabs[2].visContext).toEqual(
      expect.objectContaining({
        suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
        requestData: {
          dataViewId: 'esql-data-view',
          timeField: '@timestamp',
          breakdownField: 'service.name',
        },
      })
    );
    expect(JSON.parse(session.tabs[2].controlGroupJson ?? '{}')).toEqual({
      'service-control': {
        order: 0,
        type: ESQL_CONTROL,
        width: CONTROL_WIDTH_MEDIUM,
        grow: DEFAULT_PINNED_CONTROL_STATE.grow,
        control_type: 'STATIC_VALUES',
        available_options: ['api', 'web'],
        selected_options: ['api'],
        single_select: true,
        variable_name: 'service',
        variable_type: 'values',
        title: 'Service',
      },
    });
  });

  it('restores an ES|QL chart fingerprint on a classic tab without inheriting its interval', () => {
    const classicTab: ApiClassicTab = {
      ...inlineApiTab,
      data_source: { type: 'data_view_reference', ref_id: 'logs-data-view' },
      chart_interval: 'h',
      breakdown_field: 'service.name',
      vis_context: response.data.tabs[2].vis_context,
    };

    // Load without previous runtime state: the chart must carry its own ES|QL fingerprint.
    const session = prepareDiscoverSession({
      ...response,
      data: { ...response.data, tabs: [classicTab] },
    });

    expect(session.tabs[0].visContext).toEqual({
      suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
      attributes: classicTab.vis_context?.attributes,
      requestData: {
        dataViewId: 'esql-data-view',
        timeField: '@timestamp',
        breakdownField: 'service.name',
      },
    });
  });

  it('keeps the submitted chart and its live fingerprint after saving', async () => {
    const session = prepareDiscoverSession(response);
    const requestData = {
      dataViewId: 'current-esql-data-view',
      timeField: '@timestamp',
      breakdownField: 'service.name',
    };
    session.tabs[2].visContext = {
      suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
      attributes: response.data.tabs[2].vis_context?.attributes,
      requestData,
    };
    const tabsBeforeSave = cloneDeep(session.tabs);

    const savedSession = await saveSession(session, response);

    expect(savedSession?.tabs[2].visContext).toStrictEqual(tabsBeforeSave[2].visContext);
    expect(session.tabs).toStrictEqual(tabsBeforeSave);
  });

  it('preserves a chart whose ES|QL fingerprint cannot be reconstructed', () => {
    const classicTab: ApiClassicTab = {
      ...inlineApiTab,
      data_source: { type: 'data_view_reference', ref_id: 'logs-data-view' },
      chart_interval: 'h',
      breakdown_field: 'service.name',
      vis_context: {
        suggestion_type: UnifiedHistogramSuggestionType.histogramForDataView,
        attributes: { visualizationType: 'lnsXY' },
      },
    };
    const chartResponse: ApiResponse = {
      ...response,
      data: { ...response.data, tabs: [classicTab] },
    };

    const session = prepareDiscoverSession(chartResponse);

    expect(session.tabs[0].visContext).toStrictEqual({
      suggestionType: UnifiedHistogramSuggestionType.histogramForDataView,
      attributes: classicTab.vis_context?.attributes,
      requestData: {},
    });
    expect(fromDiscoverSessionApiResponse(chartResponse).tabs[0].visContext).toStrictEqual(
      session.tabs[0].visContext
    );
  });

  it.each([
    { label: 'unchanged', ids: ['first', 'last'], expectedOrders: [0, 2] },
    { label: 'reordered', ids: ['last', 'first'], expectedOrders: [0, 1] },
  ])(
    'keeps the submitted orders and configuration for $label controls after saving',
    async ({ ids, expectedOrders }) => {
      const apiControls: NonNullable<ApiTab['control_panels']> = ids.map((id) => ({
        id,
        type: ESQL_CONTROL,
        width: CONTROL_WIDTH_MEDIUM,
        grow: true,
        config: {
          control_type: 'STATIC_VALUES',
          available_options: ['api', 'web'],
          selected_options: ['web'],
          single_select: true,
          variable_name: id,
          variable_type: 'values',
        },
      }));
      const saveResponse: ApiResponse = {
        ...response,
        data: {
          ...response.data,
          tabs: [{ ...response.data.tabs[2], control_panels: apiControls }],
        },
      };
      const session = prepareDiscoverSession(saveResponse);
      session.tabs[0].controlGroupJson = JSON.stringify(
        Object.fromEntries(
          apiControls.map(({ id, type, width, grow, config }, index) => [
            id,
            {
              type,
              width,
              grow,
              ...config,
              order: expectedOrders[index],
            },
          ])
        )
      );
      const tabsBeforeSave = cloneDeep(session.tabs);

      const savedSession = await saveSession(session, saveResponse);

      expect(JSON.parse(savedSession?.tabs[0].controlGroupJson ?? '{}')).toEqual(
        Object.fromEntries(
          apiControls.map(({ id, type, width, grow, config }, index) => [
            id,
            { type, width, grow, ...config, order: expectedOrders[index] },
          ])
        )
      );
      expect(session.tabs).toStrictEqual(tabsBeforeSave);
    }
  );

  it('round-trips the complete API document', () => {
    const session = prepareDiscoverSession(response);

    const expectedInlineTab = {
      ...inlineApiTab,
      filters: inlineApiTab.filters.map((filter) => ({ ...filter, disabled: false })),
    };

    expect(toDiscoverSessionApiData(session)).toEqual({
      ...response.data,
      tabs: [response.data.tabs[0], expectedInlineTab, response.data.tabs[2]],
    });
  });

  it('round-trips ES|QL filtering as part of the query', () => {
    const session = fromDiscoverSessionApiResponse(response);
    const esqlTab = toDiscoverSessionApiData(session).tabs.find(
      (tab): tab is ApiEsqlTab => tab.data_source.type === 'esql'
    );

    expect(esqlTab?.data_source.query).toBe('FROM logs-* | WHERE status == 500');
    expect(esqlTab).not.toHaveProperty('filters');
  });

  it('keeps inline IDs runtime-only and preserves filters for other data views', () => {
    const session = prepareDiscoverSession(response);
    const inlineTab = session.tabs[1];

    expect(inlineTab.serializedSearchSource.index).toEqual(
      expect.objectContaining({
        id: 'runtime-inline-id',
        title: 'logs-*',
        sourceFilters: [{ value: 'secret.*' }],
      })
    );
    expect(inlineTab.serializedSearchSource.filter?.[0].meta.index).toBe('runtime-inline-id');
    expect(inlineTab.serializedSearchSource.filter?.[1].meta.index).toBe('foreign-data-view-id');

    const apiTab = toDiscoverSessionApiData(session).tabs[1];
    const filters = 'filters' in apiTab ? apiTab.filters ?? [] : [];
    expect(apiTab.data_source).not.toHaveProperty('id');
    expect(filters[0].data_view_id).toBeUndefined();
    expect(filters[1].data_view_id).toBe('foreign-data-view-id');
  });

  it('keeps pinned filters out of the API document', () => {
    const session = fromDiscoverSessionApiResponse(response);
    const pinnedFilter = {
      meta: { index: 'logs-data-view' },
      query: { match_all: {} },
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    session.tabs[0].serializedSearchSource.filter = [pinnedFilter];

    const apiTab = toDiscoverSessionApiData(session).tabs[0];
    const filters = 'filters' in apiTab ? apiTab.filters : undefined;

    expect(filters).toEqual([]);
  });

  it('builds references from the document without including inline IDs or pinned filters', () => {
    const session = prepareDiscoverSession(response);
    const inlineTab = session.tabs[1];
    inlineTab.serializedSearchSource.filter = [
      {
        meta: { index: 'pinned-data-view' },
        query: { match_all: {} },
        $state: { store: FilterStateStore.GLOBAL_STATE },
      },
      ...(inlineTab.serializedSearchSource.filter ?? []),
    ];

    const data = toDiscoverSessionApiData(session);

    expect(getDiscoverSessionReferences(data)).toStrictEqual([
      { id: 'tag-1', type: 'tag', name: 'tag-ref-tag-1' },
      {
        id: 'logs-data-view',
        type: 'index-pattern',
        name: 'tab_classic-ref.kibanaSavedObjectMeta.searchSourceJSON.index',
      },
      {
        id: 'foreign-data-view-id',
        type: 'index-pattern',
        name: 'tab_classic-inline.kibanaSavedObjectMeta.searchSourceJSON.filter[1].meta.index',
      },
    ]);
  });

  it('keeps the inline spec and its ID when the API omits runtime-only fields', async () => {
    const firstSession = prepareDiscoverSession(response);
    const inlineDataView = firstSession.tabs[1].serializedSearchSource.index;
    expect(inlineDataView).toEqual(expect.any(Object));
    if (!inlineDataView || typeof inlineDataView === 'string') {
      return;
    }

    Object.assign(inlineDataView, {
      fieldFormats: {},
      runtimeFieldMap: {},
      fieldAttrs: {},
      allowNoIndex: false,
      allowHidden: false,
      managed: false,
    });
    const specBeforeSave = cloneDeep(inlineDataView);
    const secondSession = await saveSession(firstSession, response);

    expect(secondSession?.tabs[1].serializedSearchSource.index).toStrictEqual(specBeforeSave);
    expect(mockedUuidv4).toHaveBeenCalledTimes(1);
  });

  it('keeps inline IDs and pinned filters unchanged across consecutive saves', async () => {
    const session = prepareDiscoverSession(response);
    const inlineTab = session.tabs[1];
    inlineTab.serializedSearchSource.filter = [
      ...(inlineTab.serializedSearchSource.filter ?? []),
      {
        meta: { index: 'runtime-inline-id' },
        query: { term: { environment: 'production' } },
        $state: { store: FilterStateStore.GLOBAL_STATE },
      },
    ];
    const tabsBeforeSave = cloneDeep(session.tabs);

    const firstSave = await saveSession(session, response);
    const secondSave = await saveSession(session, response);

    expect(secondSave).toStrictEqual(firstSave);
    expect(firstSave?.tabs).toStrictEqual(tabsBeforeSave);
    expect(secondSave?.tabs).toStrictEqual(tabsBeforeSave);
    expect(secondSave?.tabs[1].serializedSearchSource.filter).toHaveLength(3);
    expect(mockedUuidv4).toHaveBeenCalledTimes(1);
    expect(session.tabs).toStrictEqual(tabsBeforeSave);
  });

  it('reuses one runtime ID for identical inline data views in different tabs', () => {
    mockedUuidv4.mockReturnValueOnce('runtime-inline-a');

    const session = prepareDiscoverSession(createInlineTabsResponse());

    expect(session.tabs[0].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-a' })
    );
    expect(session.tabs[1].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-a' })
    );
    expect(mockedUuidv4).toHaveBeenCalledTimes(1);
  });

  it('preserves per-tab runtime IDs for separate inline data views with identical specs', async () => {
    mockedUuidv4.mockReturnValueOnce('runtime-inline-a');

    const sharedResponse = createInlineTabsResponse();
    const session = prepareDiscoverSession(sharedResponse);
    const secondDataView = session.tabs[1].serializedSearchSource.index;
    expect(secondDataView).toEqual(expect.any(Object));
    if (!secondDataView || typeof secondDataView === 'string') {
      return;
    }

    secondDataView.id = 'runtime-inline-b';
    session.tabs[1].serializedSearchSource.filter = updateFilterReferences(
      session.tabs[1].serializedSearchSource.filter ?? [],
      'runtime-inline-a',
      'runtime-inline-b'
    );

    const savedSession = await saveSession(session, sharedResponse);

    expect(savedSession?.tabs[0].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-a' })
    );
    expect(savedSession?.tabs[1].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-b' })
    );
    expect(mockedUuidv4).toHaveBeenCalledTimes(1);
  });

  it('uses different runtime IDs for different inline data view specs', () => {
    mockedUuidv4.mockReturnValueOnce('runtime-inline-a').mockReturnValueOnce('runtime-inline-b');

    const session = prepareDiscoverSession(
      createInlineTabsResponse([inlineApiDataView, changedInlineDataView])
    );

    expect(session.tabs[0].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-a' })
    );
    expect(session.tabs[1].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-b' })
    );
  });

  it('keeps the ID assigned by editing an inline data view without changing the other tab', async () => {
    mockedUuidv4.mockReturnValueOnce('runtime-inline-a');

    const sharedResponse = createInlineTabsResponse();
    const sharedSession = prepareDiscoverSession(sharedResponse);
    const editedTab = sharedSession.tabs[0];
    // Discover assigns a new ID when editing an inline data view, before saving the session.
    editedTab.serializedSearchSource.index = {
      id: 'edited-inline-id',
      title: 'logs-*',
      name: 'Inline logs',
      timeFieldName: '@timestamp',
      sourceFilters: [{ value: 'private.*' }],
    };
    editedTab.serializedSearchSource.filter = updateFilterReferences(
      editedTab.serializedSearchSource.filter ?? [],
      'runtime-inline-a',
      'edited-inline-id'
    );
    const tabsBeforeSave = cloneDeep(sharedSession.tabs);

    const changedSession = await saveSession(
      sharedSession,
      createInlineTabsResponse([changedInlineDataView, inlineApiDataView])
    );

    expect(changedSession?.tabs[0].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'edited-inline-id' })
    );
    expect(changedSession?.tabs[1].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-a' })
    );
    expect(changedSession?.tabs).toStrictEqual(tabsBeforeSave);
    expect(mockedUuidv4).toHaveBeenCalledTimes(1);
  });

  it('maps alias resolution metadata into the runtime session', () => {
    const session = fromDiscoverSessionApiResponse(response, {
      outcome: 'aliasMatch',
      aliasTargetId: 'session-id',
      aliasPurpose: 'savedObjectConversion',
    });

    expect(session.sharingSavedObjectProps).toEqual({
      outcome: 'aliasMatch',
      aliasTargetId: 'session-id',
      aliasPurpose: 'savedObjectConversion',
    });
  });

  it('maps conflict resolution metadata into the runtime session', () => {
    const session = fromDiscoverSessionApiResponse(response, {
      outcome: 'conflict',
      aliasTargetId: 'other-session',
      aliasPurpose: 'savedObjectImport',
    });

    expect(session.sharingSavedObjectProps).toEqual({
      outcome: 'conflict',
      aliasTargetId: 'other-session',
      aliasPurpose: 'savedObjectImport',
    });
  });

  it('normalizes the legacy ES|QL control type and camelCase config before saving', () => {
    const session = fromDiscoverSessionApiResponse(response);
    const controlGroup = JSON.parse(session.tabs[2].controlGroupJson ?? '{}');
    controlGroup['service-control'] = {
      order: 0,
      type: 'esqlControl',
      width: CONTROL_WIDTH_MEDIUM,
      grow: DEFAULT_PINNED_CONTROL_STATE.grow,
      controlType: 'STATIC_VALUES',
      availableOptions: ['api', 'web'],
      selectedOptions: ['api'],
      singleSelect: true,
      variableName: 'service',
      variableType: 'values',
      title: 'Service',
    };
    session.tabs[2].controlGroupJson = JSON.stringify(controlGroup);

    const apiTab = toDiscoverSessionApiData(session).tabs[2];
    expect(apiTab.control_panels?.[0]).toEqual(
      expect.objectContaining({
        type: ESQL_CONTROL,
        config: expect.objectContaining({
          control_type: 'STATIC_VALUES',
          available_options: ['api', 'web'],
          selected_options: ['api'],
          single_select: true,
          variable_name: 'service',
          variable_type: 'values',
        }),
      })
    );
  });

  it('fails the save when control panel JSON is invalid', () => {
    const session = fromDiscoverSessionApiResponse(response);
    session.tabs[2].controlGroupJson = '{';

    expect(() => toDiscoverSessionApiData(session)).toThrow(
      'control panel state is not valid JSON'
    );
  });

  it('fails the save rather than dropping an unsupported control panel', () => {
    const session = fromDiscoverSessionApiResponse(response);
    session.tabs[2].controlGroupJson = JSON.stringify({
      'unsupported-control': {
        order: 0,
        type: 'options_list_control',
      },
    });

    expect(() => toDiscoverSessionApiData(session)).toThrow(
      'Unsupported Discover control panel type [options_list_control]'
    );
  });

  it('fails the save with a clear error when a control panel is malformed', () => {
    const session = fromDiscoverSessionApiResponse(response);
    session.tabs[2].controlGroupJson = JSON.stringify({ 'broken-control': null });

    expect(() => toDiscoverSessionApiData(session)).toThrow(
      'control panel [broken-control] must be an object'
    );
  });
});

const saveSession = (session: SaveDiscoverSessionParams, saveResponse: ApiResponse) => {
  const persistence = createDiscoverSessionPersistence({
    apiClient: {
      get: jest.fn(),
      create: jest.fn().mockResolvedValue(saveResponse),
      upsert: jest.fn().mockResolvedValue(saveResponse),
    },
    legacyClient: savedSearchPluginMock.createStartContract(),
    useHttpApi: true,
  });

  return persistence.save(session, {});
};
