/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_ESQL_DATA_SOURCE_TYPE,
} from '@kbn/as-code-data-views-schema';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionApiData } from '../schema';
import { transformDiscoverSessionIn } from './transform_discover_session_in';
import { transformDiscoverSessionOut } from './transform_discover_session_out';
import {
  discoverSessionApiData,
  discoverSessionAttributes,
} from './transform_discover_session.fixtures';

describe('discover session API transforms', () => {
  const apiData: DiscoverSessionApiData = {
    title: 'Session',
    description: 'Session description',
    tabs: [
      {
        id: 'tab-classic',
        label: 'Classic',
        data_source: {
          type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
          ref_id: 'logs-data-view',
        },
        query: { language: 'kql', expression: 'service.name : "api"' },
        filters: [],
        sort: [{ name: '@timestamp', direction: 'desc' }],
        view_mode: VIEW_MODE.DOCUMENT_LEVEL,
        hide_chart: false,
        hide_table: false,
        hide_aggregated_preview: true,
        breakdown_field: 'host.name',
        chart_interval: 'h',
        time_restore: true,
        time_range: { from: 'now-15m', to: 'now' },
        refresh_interval: { pause: true, value: 0 },
        vis_context: {
          suggestion_type: UnifiedHistogramSuggestionType.histogramForDataView,
          attributes: {
            visualizationType: 'lnsXY',
            state: { foo: 'bar' },
          },
        },
      },
      {
        id: 'tab-esql',
        label: 'ES|QL',
        data_source: {
          type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
          query: 'FROM logs-* | LIMIT 10',
        },
        sort: [],
        hide_chart: false,
        hide_table: false,
        time_restore: false,
        control_panels: [
          {
            id: 'control-1',
            type: ESQL_CONTROL,
            width: 'medium',
            grow: false,
            config: {
              control_type: 'STATIC_VALUES',
              variable_name: 'foo',
              variable_type: 'values',
              available_options: ['bar'],
              selected_options: ['bar'],
              single_select: true,
            },
          },
        ],
      },
    ],
  };

  const expectedControlGroupJson = JSON.stringify({
    'control-1': {
      order: 0,
      type: ESQL_CONTROL,
      width: 'medium',
      grow: false,
      control_type: 'STATIC_VALUES',
      variable_name: 'foo',
      variable_type: 'values',
      available_options: ['bar'],
      selected_options: ['bar'],
      single_select: true,
    },
  });

  describe('transform out', () => {
    it('maps saved object attributes to API data', () => {
      const transformed = transformDiscoverSessionOut(discoverSessionAttributes);
      expect(transformed).toEqual(discoverSessionApiData);
    });

    it('converts legacy flat tab sort to API sort objects', () => {
      const attributes = {
        ...discoverSessionAttributes,
        tabs: discoverSessionAttributes.tabs.map((tab, index) =>
          index === 0
            ? {
                ...tab,
                attributes: {
                  ...tab.attributes,
                  sort: ['@timestamp', 'desc'],
                },
              }
            : tab
        ),
      };

      const transformed = transformDiscoverSessionOut(attributes);
      expect(transformed.tabs[0].sort).toEqual([{ name: '@timestamp', direction: 'desc' }]);
    });
  });

  describe('transform in', () => {
    it('normalizes fixture API data back to stored attributes', () => {
      const { attributes, references } = transformDiscoverSessionIn(discoverSessionApiData);

      expect(attributes).toEqual({
        title: discoverSessionApiData.title,
        description: discoverSessionApiData.description,
        tabs: [
          {
            id: discoverSessionApiData.tabs[0].id,
            label: discoverSessionApiData.tabs[0].label,
            attributes: {
              sort: [
                ['transaction.id', 'asc'],
                ['@timestamp', 'desc'],
              ],
              columns: ['message', 'transaction.id'],
              grid: {
                columns: {
                  message: {
                    width: 418,
                  },
                },
              },
              hideChart: false,
              hideTable: false,
              isTextBasedQuery: false,
              usesAdHocDataView: true,
              kibanaSavedObjectMeta: {
                searchSourceJSON:
                  '{"query":{"query":"","language":"kuery"},"filter":[],"index":{"title":"logs*,-logstash*,filebeat-*","timeFieldName":"@timestamp","allowHidden":false}}',
              },
              viewMode: VIEW_MODE.DOCUMENT_LEVEL,
              hideAggregatedPreview: false,
              rowHeight: 1,
              headerRowHeight: 1,
              timeRestore: true,
              timeRange: {
                from: 'now/d',
                to: 'now/d',
              },
              refreshInterval: {
                value: 60000,
                pause: true,
              },
              rowsPerPage: 25,
              sampleSize: 100,
              breakdownField: 'transaction.id',
              chartInterval: 'h',
              density: 'compact',
              controlGroupJson: undefined,
              visContext: undefined,
            },
          },
          {
            id: discoverSessionApiData.tabs[1].id,
            label: discoverSessionApiData.tabs[1].label,
            attributes: {
              sort: [['transaction.id', 'asc']],
              columns: [],
              grid: {},
              hideChart: false,
              hideTable: false,
              isTextBasedQuery: true,
              usesAdHocDataView: false,
              kibanaSavedObjectMeta: {
                searchSourceJSON:
                  '{"query":{"esql":"FROM logs*,-logstash*,filebeat-* | WHERE ??field_name == ?field_value"}}',
              },
              hideAggregatedPreview: false,
              rowHeight: 1,
              headerRowHeight: 1,
              timeRestore: true,
              timeRange: {
                from: 'now/d',
                to: 'now/d',
              },
              refreshInterval: {
                value: 60000,
                pause: false,
              },
              rowsPerPage: 25,
              sampleSize: 100,
              breakdownField: 'transaction.id',
              chartInterval: 'h',
              density: 'compact',
              visContext: {
                suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
                requestData: {
                  dataViewId: '6972ccae5b7ff51c24c1129b58e8dc6d56649983d2bb717806063e2da57e0c20',
                  timeField: '@timestamp',
                  breakdownField: 'transaction.id',
                },
                attributes: (discoverSessionApiData.tabs[1] as DiscoverSessionApiData['tabs'][1])
                  .vis_context!.attributes,
              },
              controlGroupJson: JSON.stringify({
                'e2be5bb5-87d2-4226-8950-2614f0522209': {
                  order: 0,
                  type: ESQL_CONTROL,
                  width: 'medium',
                  grow: false,
                  selected_options: ['event.dataset'],
                  variable_name: 'field_name',
                  single_select: true,
                  variable_type: 'fields',
                  control_type: 'STATIC_VALUES',
                  available_options: ['event.dataset', 'event.module', 'event.type'],
                  title: 'field_name',
                },
                'c8106b8e-e13a-4dc4-9fc6-1a8c48e70464': {
                  order: 1,
                  type: ESQL_CONTROL,
                  width: 'medium',
                  grow: false,
                  selected_options: ['kibana.log'],
                  variable_name: 'field_value',
                  single_select: true,
                  variable_type: 'values',
                  control_type: 'VALUES_FROM_QUERY',
                  esql_query:
                    'FROM logs*,-logstash*,filebeat-* | WHERE @timestamp <= ?_tend and @timestamp > ?_tstart | STATS BY ??field_name',
                  title: 'field_value',
                },
              }),
            },
          },
        ],
      });
      expect(references).toEqual([]);
    });
    it('adds tab-prefixed references for data view reference tabs', () => {
      const { attributes, references } = transformDiscoverSessionIn(apiData);

      expect(attributes.tabs[0].attributes.visContext).toEqual({
        suggestionType: UnifiedHistogramSuggestionType.histogramForDataView,
        requestData: {
          dataViewId: 'logs-data-view',
          timeInterval: 'h',
          breakdownField: 'host.name',
        },
        attributes: {
          visualizationType: 'lnsXY',
          state: { foo: 'bar' },
        },
      });
      expect(attributes.tabs[1].attributes.controlGroupJson).toBe(expectedControlGroupJson);
      expect(references).toContainEqual({
        name: 'tab_tab-classic.kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
        id: 'logs-data-view',
      });
    });
  });

  describe('visContext requestData extraction', () => {
    const [classicTab, esqlTab] = apiData.tabs;

    const buildEsqlVisContext = ({
      layers,
      adHocDataViews,
      suggestionType = UnifiedHistogramSuggestionType.histogramForESQL,
    }: {
      layers: Record<string, Record<string, unknown>>;
      adHocDataViews?: Record<string, Record<string, unknown>>;
      suggestionType?: NonNullable<
        DiscoverSessionApiData['tabs'][number]['vis_context']
      >['suggestion_type'];
    }) => ({
      suggestion_type: suggestionType,
      attributes: {
        visualizationType: 'lnsXY',
        state: {
          datasourceStates: { textBased: { layers } },
          ...(adHocDataViews && { adHocDataViews }),
        },
      },
    });

    const getStoredVisContext = (tab: DiscoverSessionApiData['tabs'][number]) =>
      transformDiscoverSessionIn({ ...apiData, tabs: [tab] }).attributes.tabs[0].attributes
        .visContext;

    it('extracts the fingerprint from the chart blob for ES|QL tabs', () => {
      const layers = { 'layer-1': { index: 'esql-dv' } };
      const adHocDataViews = { 'esql-dv': { type: 'esql', timeFieldName: '@timestamp' } };

      const histogramVisContext = buildEsqlVisContext({ layers, adHocDataViews });
      expect(
        getStoredVisContext({
          ...esqlTab,
          breakdown_field: 'host.name',
          vis_context: histogramVisContext,
        })
      ).toEqual({
        suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
        requestData: {
          dataViewId: 'esql-dv',
          timeField: '@timestamp',
          breakdownField: 'host.name',
        },
        attributes: histogramVisContext.attributes,
      });

      const lensVisContext = buildEsqlVisContext({
        layers,
        adHocDataViews,
        suggestionType: UnifiedHistogramSuggestionType.lensSuggestion,
      });
      expect(getStoredVisContext({ ...esqlTab, vis_context: lensVisContext })).toEqual({
        suggestionType: UnifiedHistogramSuggestionType.lensSuggestion,
        requestData: {
          dataViewId: 'esql-dv',
          timeField: '@timestamp',
        },
        attributes: lensVisContext.attributes,
      });
    });

    it('preserves a dormant ES|QL fingerprint on classic tabs without inheriting timeInterval', () => {
      const visContext = buildEsqlVisContext({
        layers: { 'layer-1': { index: 'esql-dv' } },
        adHocDataViews: { 'esql-dv': { type: 'esql', timeFieldName: '@timestamp' } },
      });

      expect(getStoredVisContext({ ...classicTab, vis_context: visContext })).toEqual({
        suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
        requestData: {
          dataViewId: 'esql-dv',
          timeField: '@timestamp',
          breakdownField: 'host.name',
        },
        attributes: visContext.attributes,
      });
    });

    it('selects the data view through the layer linkage and falls back on ambiguity', () => {
      const ambiguous = buildEsqlVisContext({
        layers: { 'layer-1': { index: 'esql-dv-a' }, 'layer-2': { index: 'esql-dv-b' } },
        adHocDataViews: {
          'esql-dv-a': { type: 'esql', timeFieldName: '@timestamp' },
          'esql-dv-b': { type: 'esql', timeFieldName: '@timestamp' },
        },
      });

      expect(
        getStoredVisContext({ ...esqlTab, breakdown_field: 'host.name', vis_context: ambiguous })
      ).toEqual(expect.objectContaining({ requestData: { breakdownField: 'host.name' } }));

      const sameDataView = buildEsqlVisContext({
        layers: { 'layer-1': { index: 'esql-dv' }, 'layer-2': { index: 'esql-dv' } },
        adHocDataViews: {
          'unused-esql-dv': { type: 'esql', timeFieldName: 'event.ingested' },
          'esql-dv': { type: 'esql', timeFieldName: '@timestamp' },
        },
      });

      expect(getStoredVisContext({ ...esqlTab, vis_context: sameDataView })).toEqual(
        expect.objectContaining({
          requestData: { dataViewId: 'esql-dv', timeField: '@timestamp' },
        })
      );
    });

    it('extracts the fingerprint without a time field and omits an empty breakdown field', () => {
      const visContext = buildEsqlVisContext({
        layers: { 'layer-1': { index: 'esql-dv' } },
        adHocDataViews: { 'esql-dv': { type: 'esql' } },
      });

      expect(
        getStoredVisContext({ ...esqlTab, breakdown_field: '', vis_context: visContext })
      ).toEqual(expect.objectContaining({ requestData: { dataViewId: 'esql-dv' } }));
    });

    it('falls back when the blob is not a recognizable ES|QL chart', () => {
      const unrecognizable = {
        suggestion_type: UnifiedHistogramSuggestionType.histogramForESQL as const,
        attributes: { visualizationType: 'lnsXY', state: { foo: 'bar' } },
      };

      expect(
        getStoredVisContext({
          ...esqlTab,
          breakdown_field: 'host.name',
          vis_context: unrecognizable,
        })
      ).toEqual(expect.objectContaining({ requestData: { breakdownField: 'host.name' } }));

      const wrongDataViewType = buildEsqlVisContext({
        layers: { 'layer-1': { index: 'a-persisted-dv' } },
        adHocDataViews: { 'a-persisted-dv': { type: 'index-pattern' } },
      });

      expect(
        getStoredVisContext({
          ...esqlTab,
          breakdown_field: '',
          vis_context: wrongDataViewType,
        })
      ).toEqual(expect.objectContaining({ requestData: {} }));
    });

    it('keeps behavior unchanged without a vis_context', () => {
      expect(getStoredVisContext(esqlTab)).toBeUndefined();

      const classicTabWithoutVisContext = { ...classicTab };
      delete classicTabWithoutVisContext.vis_context;

      expect(getStoredVisContext(classicTabWithoutVisContext)).toBeUndefined();
    });
  });

  describe('round-trip', () => {
    it('round-trips fixture API data through persistence', () => {
      const { attributes, references } = transformDiscoverSessionIn(discoverSessionApiData);
      const roundTripped = transformDiscoverSessionOut(attributes, references);

      expect(roundTripped).toEqual(discoverSessionApiData);
    });

    it('round-trips fixture saved object attributes through API', () => {
      const apiDataFromStored = transformDiscoverSessionOut(discoverSessionAttributes);
      const { attributes, references } = transformDiscoverSessionIn(apiDataFromStored);
      const roundTripped = transformDiscoverSessionOut(attributes, references);

      expect(apiDataFromStored).toEqual(discoverSessionApiData);
      expect(roundTripped).toEqual(discoverSessionApiData);
      expect(references).toEqual([]);
    });

    it('round-trips fixture saved object attributes preserving API-representable persistence values', () => {
      const reverted = transformDiscoverSessionIn(
        transformDiscoverSessionOut(discoverSessionAttributes)
      ).attributes;
      const expected = transformDiscoverSessionIn(discoverSessionApiData).attributes;

      expect(reverted).toEqual(expected);
      expect(reverted.tabs[0].attributes.controlGroupJson).toBeUndefined();
      expect(reverted.tabs[1].attributes.usesAdHocDataView).toBe(false);
    });
  });

  it('round-trips API data and preserves semantic values', () => {
    const { attributes, references } = transformDiscoverSessionIn(apiData);
    const roundTripped = transformDiscoverSessionOut(attributes, references);
    const reverted = transformDiscoverSessionIn(roundTripped);

    expect(roundTripped).toMatchObject(apiData);
    expect(roundTripped.tabs[0]).toMatchObject({
      column_order: [],
      density: 'compact',
      header_row_height: 3,
    });
    expect(roundTripped.tabs[1]).toMatchObject({
      column_order: [],
      density: 'compact',
      header_row_height: 3,
      control_panels: [
        {
          width: 'medium',
          grow: false,
        },
      ],
    });
    expect(reverted.attributes.tabs[0].attributes.visContext).toEqual({
      suggestionType: UnifiedHistogramSuggestionType.histogramForDataView,
      requestData: {
        dataViewId: 'logs-data-view',
        timeInterval: 'h',
        breakdownField: 'host.name',
      },
      attributes: {
        visualizationType: 'lnsXY',
        state: { foo: 'bar' },
      },
    });
    expect(reverted.attributes.tabs[1].attributes.controlGroupJson).toBe(expectedControlGroupJson);
    expect(reverted.references).toEqual(references);
  });
});
