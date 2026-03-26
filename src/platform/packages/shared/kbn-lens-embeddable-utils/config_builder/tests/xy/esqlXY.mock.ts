/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYDataLayerConfig } from '@kbn/lens-common';
import type { LensAttributes } from '../../types';

const LAYER_ID = 'c2eacea8-91d4-4372-a82d-8760979ff893';

export const esqlChart: LensAttributes = {
  title: 'Bar vertical stacked',
  references: [],
  state: {
    datasourceStates: {
      textBased: {
        layers: {
          'c2eacea8-91d4-4372-a82d-8760979ff893': {
            index: '32eec79c9673ab1b9265f3e422e8f952778f02c82eaf13147a9c0ba86290337a',
            query: {
              esql: 'FROM kibana_sample_data_ecommerce \n| EVAL buckets = DATE_TRUNC(12 hours, order_date)  | STATS count = COUNT(*) BY buckets',
            },
            columns: [
              {
                columnId: 'count',
                fieldName: 'count',
                label: 'count',
                customLabel: false,
                meta: {
                  type: 'number',
                  esType: 'long',
                },
                inMetricDimension: true,
              },
              {
                columnId: 'buckets',
                fieldName: 'buckets',
                label: 'buckets',
                customLabel: false,
                meta: {
                  type: 'date',
                  esType: 'date',
                },
              },
            ],
          },
        },
      },
    },
    filters: [],
    query: {
      esql: 'FROM kibana_sample_data_ecommerce \n| EVAL buckets = DATE_TRUNC(12 hours, order_date)\n  | STATS count = COUNT(*) BY buckets /* try out different intervals */',
    },
    visualization: {
      legend: {
        isVisible: true,
        position: 'right',
      },
      valueLabels: 'hide',
      fittingFunction: 'Linear',
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      labelsOrientation: {
        x: 0,
        yLeft: 0,
        yRight: 0,
      },
      gridlinesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      preferredSeriesType: 'bar_stacked',
      layers: [
        {
          layerId: 'c2eacea8-91d4-4372-a82d-8760979ff893',
          seriesType: 'bar_stacked',
          xAccessor: 'buckets',
          accessors: ['count'],
          layerType: 'data',
          colorMapping: {
            assignments: [],
            specialAssignments: [
              {
                rules: [
                  {
                    type: 'other',
                  },
                ],
                color: {
                  type: 'loop',
                },
                touched: false,
              },
            ],
            paletteId: 'default',
            colorMode: {
              type: 'categorical',
            },
          },
        },
      ],
    },
    adHocDataViews: {
      '32eec79c9673ab1b9265f3e422e8f952778f02c82eaf13147a9c0ba86290337a': {
        id: '32eec79c9673ab1b9265f3e422e8f952778f02c82eaf13147a9c0ba86290337a',
        title: 'kibana_sample_data_ecommerce',
        sourceFilters: [],
        type: 'esql',
        fieldFormats: {},
        runtimeFieldMap: {},
        allowNoIndex: false,
        name: 'kibana_sample_data_ecommerce',
        allowHidden: false,
        managed: false,
      },
    },
    needsRefresh: false,
  },
  visualizationType: 'lnsXY',
  version: 2,
};

/**
 * Derives from esqlChart, adding a breakdown column (category) with colorMapping assignments
 */
export const esqlChartWithBreakdownColorMapping: LensAttributes = {
  ...esqlChart,
  title: 'ES|QL bar with breakdown color mapping',
  state: {
    ...esqlChart.state,
    datasourceStates: {
      textBased: {
        layers: {
          [LAYER_ID]: {
            ...esqlChart.state.datasourceStates.textBased!.layers[LAYER_ID],
            query: {
              esql: 'FROM kibana_sample_data_ecommerce \n| EVAL buckets = DATE_TRUNC(12 hours, order_date)  | STATS count = COUNT(*) BY buckets, category',
            },
            columns: [
              ...esqlChart.state.datasourceStates.textBased!.layers[LAYER_ID].columns,
              {
                columnId: 'category',
                fieldName: 'category',
                label: 'category',
                customLabel: false,
                meta: {
                  type: 'string',
                  esType: 'keyword',
                },
              },
            ],
          },
        },
      },
    },
    query: {
      esql: 'FROM kibana_sample_data_ecommerce \n| EVAL buckets = DATE_TRUNC(12 hours, order_date)  | STATS count = COUNT(*) BY buckets, category',
    },
    visualization: {
      ...(esqlChart.state.visualization as Record<string, unknown>),
      layers: [
        {
          ...(esqlChart.state.visualization as { layers: XYDataLayerConfig[] }).layers[0],
          splitAccessors: ['category'],
          colorMapping: {
            assignments: [
              {
                rules: [{ type: 'raw', value: 'Clothing' }],
                color: { type: 'colorCode', colorCode: '#ff0000' },
                touched: false,
              },
            ],
            specialAssignments: [
              {
                rules: [{ type: 'other' }],
                color: { type: 'loop' },
                touched: false,
              },
            ],
            paletteId: 'default',
            colorMode: { type: 'categorical' },
          },
        },
      ],
    },
  },
};

export const esqlXYWithCollapseByBreakdown: LensAttributes = {
  title: 'ESQL XY with collapse by breakdown',
  references: [],
  state: {
    datasourceStates: {
      textBased: {
        layers: {
          'eec88dc5-7f20-46ff-bc9b-1cc9551bcc4e': {
            index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            query: {
              esql: 'FROM kibana_sample_data_logs | LIMIT 1000\n',
            },
            columns: [
              {
                columnId: '@timestamp',
                fieldName: '@timestamp',
                label: '@timestamp',
                customLabel: false,
                meta: {
                  type: 'date',
                  esType: 'date',
                },
                inMetricDimension: true,
              },
              {
                columnId: 'agent',
                fieldName: 'agent',
                label: 'agent',
                customLabel: false,
                meta: {
                  type: 'string',
                  esType: 'text',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'agent',
                  },
                  params: {
                    id: 'string',
                  },
                },
                inMetricDimension: true,
              },
              {
                columnId: 'bytes',
                fieldName: 'bytes',
                label: 'bytes',
                customLabel: false,
                meta: {
                  type: 'number',
                  esType: 'long',
                },
                inMetricDimension: true,
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
      esql: 'FROM kibana_sample_data_logs | LIMIT 1000\n',
    },
    visualization: {
      legend: {
        isVisible: true,
        position: 'right',
      },
      valueLabels: 'hide',
      fittingFunction: 'Linear',
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      labelsOrientation: {
        x: 0,
        yLeft: 0,
        yRight: 0,
      },
      gridlinesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      preferredSeriesType: 'line',
      layers: [
        {
          layerId: 'eec88dc5-7f20-46ff-bc9b-1cc9551bcc4e',
          seriesType: 'line',
          xAccessor: '@timestamp',
          splitAccessors: ['agent'],
          accessors: ['bytes'],
          layerType: 'data',
          collapseFn: 'max',
        },
      ],
    },
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
  visualizationType: 'lnsXY',
  version: 2,
};
