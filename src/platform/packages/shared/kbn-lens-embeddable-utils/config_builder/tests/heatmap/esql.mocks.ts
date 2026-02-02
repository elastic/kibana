/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HeatmapVisualizationState } from '@kbn/lens-common';

import type { LensAttributes } from '../../types';

export const simple: LensAttributes = {
  title: 'Lens Heatmap - ESQL - Simple',
  description: 'Count of records with timestamp on x-axis',
  state: {
    datasourceStates: {
      textBased: {
        layers: {
          'cce2e334-74f6-4cd3-a04c-3a889f66e2de': {
            index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            query: {
              esql: 'FROM kibana_sample_data_logs\n| STATS count() BY extension.keyword, geo.dest | LIMIT 10',
            },
            columns: [
              {
                columnId: 'count()',
                fieldName: 'count()',
                label: 'count()',
                customLabel: false,
                meta: {
                  type: 'number',
                  esType: 'long',
                },
                inMetricDimension: true,
              },
              {
                columnId: 'extension.keyword',
                fieldName: 'extension.keyword',
                label: 'extension.keyword',
                customLabel: false,
                meta: {
                  type: 'string',
                  esType: 'keyword',
                },
              },
            ],
            timeField: '@timestamp',
          },
        },
        // @ts-expect-error
        indexPatternRefs: [
          {
            id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            title: 'kibana_sample_data_logs',
            timeField: '@timestamp',
          },
        ],
      },
    },
    filters: [],
    query: {
      esql: 'FROM kibana_sample_data_logs\n| STATS count() BY extension.keyword, geo.dest | LIMIT 10',
    },
    visualization: {
      shape: 'heatmap',
      layerId: 'cce2e334-74f6-4cd3-a04c-3a889f66e2de',
      layerType: 'data',
      legend: {
        isVisible: true,
        position: 'right',
        type: 'heatmap_legend',
      },
      gridConfig: {
        type: 'heatmap_grid',
        isCellLabelVisible: false,
        isYAxisLabelVisible: true,
        isXAxisLabelVisible: true,
        isYAxisTitleVisible: false,
        isXAxisTitleVisible: false,
      },
      valueAccessor: 'count()',
      xAccessor: 'extension.keyword',
    } satisfies HeatmapVisualizationState,
    adHocDataViews: {
      e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
        id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
        title: 'kibana_sample_data_logs',
        timeFieldName: '@timestamp',
        sourceFilters: [],
        type: 'esql',
        fieldFormats: {},
        runtimeFieldMap: {},
        allowNoIndex: false,
        name: 'kibana_sample_data_logs',
        allowHidden: false,
        managed: false,
      },
    },
    needsRefresh: false,
  },
  version: 2,
  visualizationType: 'lnsHeatmap',
  references: [],
} satisfies LensAttributes;

export const withXAndYAxes: LensAttributes = {
  title: 'Lens Heatmap - ESQL - With X and Y Axes',
  description: 'Count of records with timestamp on x-axis',
  state: {
    datasourceStates: {
      textBased: {
        layers: {
          'cce2e334-74f6-4cd3-a04c-3a889f66e2de': {
            index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            query: {
              esql: 'FROM kibana_sample_data_logs\n| STATS count() BY extension.keyword, geo.dest | LIMIT 10',
            },
            columns: [
              {
                columnId: 'count()',
                fieldName: 'count()',
                label: 'count()',
                customLabel: false,
                meta: {
                  type: 'number',
                  esType: 'long',
                },
                inMetricDimension: true,
              },
              {
                columnId: 'extension.keyword',
                fieldName: 'extension.keyword',
                label: 'extension.keyword',
                customLabel: false,
                meta: {
                  type: 'string',
                  esType: 'keyword',
                },
              },
              {
                columnId: 'geo.dest',
                fieldName: 'geo.dest',
                label: 'geo.dest',
                customLabel: false,
                meta: {
                  type: 'string',
                  esType: 'keyword',
                },
              },
            ],
            timeField: '@timestamp',
          },
        },
        // @ts-expect-error
        indexPatternRefs: [
          {
            id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            title: 'kibana_sample_data_logs',
            timeField: '@timestamp',
          },
        ],
      },
    },
    filters: [],
    query: {
      esql: 'FROM kibana_sample_data_logs\n| STATS count() BY extension.keyword, geo.dest | LIMIT 10',
    },
    visualization: {
      shape: 'heatmap',
      layerId: 'cce2e334-74f6-4cd3-a04c-3a889f66e2de',
      layerType: 'data',
      legend: {
        isVisible: true,
        position: 'right',
        type: 'heatmap_legend',
      },
      gridConfig: {
        type: 'heatmap_grid',
        isCellLabelVisible: false,
        isYAxisLabelVisible: true,
        isXAxisLabelVisible: true,
        isYAxisTitleVisible: false,
        isXAxisTitleVisible: false,
      },
      valueAccessor: 'count()',
      xAccessor: 'extension.keyword',
      yAccessor: 'geo.dest',
    } satisfies HeatmapVisualizationState,
    adHocDataViews: {
      e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
        id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
        title: 'kibana_sample_data_logs',
        timeFieldName: '@timestamp',
        sourceFilters: [],
        type: 'esql',
        fieldFormats: {},
        runtimeFieldMap: {},
        allowNoIndex: false,
        name: 'kibana_sample_data_logs',
        allowHidden: false,
        managed: false,
      },
    },
    needsRefresh: false,
  },
  version: 2,
  visualizationType: 'lnsHeatmap',
  references: [],
} satisfies LensAttributes;
