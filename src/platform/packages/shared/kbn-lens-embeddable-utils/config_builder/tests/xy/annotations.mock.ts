/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DateHistogramIndexPatternColumn,
  DerivativeIndexPatternColumn,
  MaxIndexPatternColumn,
} from '@kbn/lens-common';
import type { LensAttributes } from '../../types';

export const annotationXY: LensAttributes = {
  visualizationType: 'lnsXY',
  title: 'Lens title',
  state: {
    adHocDataViews: {},
    datasourceStates: {
      formBased: {
        layers: {
          'e6f11ede-9943-4073-b9f3-1f69d0e934a8': {
            columnOrder: [
              '8362014d-fc6c-4f9e-b63f-c0cd9a3227e6',
              '8da7e0b1-770d-4f2d-aac8-53a331ac1829',
              'cd72fe6a-bf00-4504-8c64-05f052fcd724',
            ],
            columns: {
              '8362014d-fc6c-4f9e-b63f-c0cd9a3227e6': {
                dataType: 'date',
                isBucketed: true,
                label: '@timestamp',
                operationType: 'date_histogram',
                params: {
                  dropPartials: true,
                  includeEmptyRows: true,
                  interval: 'auto',
                },
                scale: 'interval',
                sourceField: '@timestamp',
              } as DateHistogramIndexPatternColumn,
              '8da7e0b1-770d-4f2d-aac8-53a331ac1829': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: 'Diff',
                operationType: 'differences',
                params: {},
                references: ['cd72fe6a-bf00-4504-8c64-05f052fcd724'],
                scale: 'ratio',
              } as DerivativeIndexPatternColumn,
              'cd72fe6a-bf00-4504-8c64-05f052fcd724': {
                dataType: 'number',
                isBucketed: false,
                label: 'Maximum of bytes',
                operationType: 'max',
                params: {
                  emptyAsNull: true,
                },
                scale: 'ratio',
                sourceField: 'bytes',
              } as MaxIndexPatternColumn,
            },
            incompleteColumns: {},
          },
        },
      },
    },
    filters: [],
    internalReferences: [],
    query: {
      language: 'kuery',
      query: '',
    },
    visualization: {
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      layers: [
        {
          accessors: ['8da7e0b1-770d-4f2d-aac8-53a331ac1829'],
          layerId: 'e6f11ede-9943-4073-b9f3-1f69d0e934a8',
          layerType: 'data',
          position: 'top',
          seriesType: 'line',
          showGridlines: false,
          xAccessor: '8362014d-fc6c-4f9e-b63f-c0cd9a3227e6',
          yConfig: [
            {
              axisMode: 'left',
              color: '#009ce0',
              forAccessor: '8da7e0b1-770d-4f2d-aac8-53a331ac1829',
            },
          ],
        },
        {
          annotations: [
            {
              color: '#ff0000',
              icon: 'triangle',
              lineWidth: 2,
              lineStyle: 'dashed',
              isHidden: false,
              id: 'cf13a990-6a33-427a-a85a-2f271116776a',
              key: {
                type: 'point_in_time',
              },
              label: 'Event',
              timeField: '@timestamp',
              type: 'query',
            },
          ],
          ignoreGlobalFilters: true,
          layerId: '16f0980e-4f7a-43d0-b5aa-e8c75c4cd930',
          layerType: 'annotations',
        },
      ],
      legend: {
        isVisible: true,
        position: 'bottom',
        showSingleSeries: true,
      },
      preferredSeriesType: 'line',
      title: 'Empty XY chart',
      valueLabels: 'hide',
      valuesInLegend: true,
      yTitle: 'Rate',
    },
  },
  references: [
    {
      id: 'metrics-*',
      name: 'indexpattern-datasource-layer-e6f11ede-9943-4073-b9f3-1f69d0e934a8',
      type: 'index-pattern',
    },
    {
      id: 'metrics-*',
      name: 'xy-visualization-layer-16f0980e-4f7a-43d0-b5aa-e8c75c4cd930',
      type: 'index-pattern',
    },
  ],
};
