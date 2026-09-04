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
import { FilterStateStore } from '@kbn/es-query';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { v4 as uuidv4 } from 'uuid';
import { fromDiscoverSessionApiResponse, toDiscoverSessionApiData } from './state_adapter';

type ApiResponse = Parameters<typeof fromDiscoverSessionApiResponse>[0];
type ApiTab = ApiResponse['data']['tabs'][number];
type ApiClassicTab = Exclude<ApiTab, { data_source: { type: 'esql' } }>;
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
        data_source: { type: 'esql', query: 'FROM logs-*' },
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

describe('Discover session state adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('materializes classic, inline, and ES|QL tabs', () => {
    const session = fromDiscoverSessionApiResponse(response);

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

  it('round-trips the complete API document', () => {
    const session = fromDiscoverSessionApiResponse(response);

    expect(toDiscoverSessionApiData(session)).toEqual(response.data);
  });

  it('keeps inline IDs runtime-only and preserves filters for other data views', () => {
    const session = fromDiscoverSessionApiResponse(response);
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

  it('reuses an inline runtime ID after runtime-only fields are removed during save', () => {
    const firstSession = fromDiscoverSessionApiResponse(response);
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
    const savedData = toDiscoverSessionApiData(firstSession);
    const secondSession = fromDiscoverSessionApiResponse(
      { ...response, data: savedData },
      undefined,
      firstSession.tabs
    );

    expect(secondSession.tabs[1].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-id' })
    );
    expect(mockedUuidv4).toHaveBeenCalledTimes(1);
  });

  it('reuses one runtime ID for identical inline data views in different tabs', () => {
    mockedUuidv4.mockReturnValueOnce('runtime-inline-a');

    const session = fromDiscoverSessionApiResponse(createInlineTabsResponse());

    expect(session.tabs[0].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-a' })
    );
    expect(session.tabs[1].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-a' })
    );
    expect(mockedUuidv4).toHaveBeenCalledTimes(1);
  });

  it('preserves per-tab runtime IDs for separate inline data views with identical specs', () => {
    mockedUuidv4.mockReturnValueOnce('runtime-inline-a');

    const sharedResponse = createInlineTabsResponse();
    const previousSession = fromDiscoverSessionApiResponse(sharedResponse);
    const secondDataView = previousSession.tabs[1].serializedSearchSource.index;
    expect(secondDataView).toEqual(expect.any(Object));
    if (!secondDataView || typeof secondDataView === 'string') {
      return;
    }

    secondDataView.id = 'runtime-inline-b';

    const session = fromDiscoverSessionApiResponse(sharedResponse, undefined, previousSession.tabs);

    expect(session.tabs[0].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-a' })
    );
    expect(session.tabs[1].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-b' })
    );
    expect(mockedUuidv4).toHaveBeenCalledTimes(1);
  });

  it('uses different runtime IDs for different inline data view specs', () => {
    mockedUuidv4.mockReturnValueOnce('runtime-inline-a').mockReturnValueOnce('runtime-inline-b');

    const session = fromDiscoverSessionApiResponse(
      createInlineTabsResponse([inlineApiDataView, changedInlineDataView])
    );

    expect(session.tabs[0].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-a' })
    );
    expect(session.tabs[1].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-b' })
    );
  });

  it('replaces a shared runtime ID when one of the specs changes', () => {
    mockedUuidv4.mockReturnValueOnce('runtime-inline-a').mockReturnValueOnce('runtime-inline-b');

    const sharedResponse = createInlineTabsResponse();
    const sharedSession = fromDiscoverSessionApiResponse(sharedResponse);
    const changedSession = fromDiscoverSessionApiResponse(
      createInlineTabsResponse([changedInlineDataView, inlineApiDataView]),
      undefined,
      sharedSession.tabs
    );

    expect(changedSession.tabs[0].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-b' })
    );
    expect(changedSession.tabs[1].serializedSearchSource.index).toEqual(
      expect.objectContaining({ id: 'runtime-inline-a' })
    );
    expect(mockedUuidv4).toHaveBeenCalledTimes(2);
  });

  it('recreates alias metadata when the requested ID resolves to another session ID', () => {
    const session = fromDiscoverSessionApiResponse(response, 'legacy-alias');

    expect(session.sharingSavedObjectProps).toEqual({
      outcome: 'aliasMatch',
      aliasTargetId: 'session-id',
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
