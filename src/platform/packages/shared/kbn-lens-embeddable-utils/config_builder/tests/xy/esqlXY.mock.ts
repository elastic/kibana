/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensAttributes } from '../../types';

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
