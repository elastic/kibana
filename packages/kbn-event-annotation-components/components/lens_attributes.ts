/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypedLensByValueInput } from '@kbn/lens-plugin/public';

export const lensAttributes = {
  title: 'Count of records over time',
  references: [
    {
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-current-indexpattern',
      type: 'index-pattern',
    },
    {
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-layer1',
      type: 'index-pattern',
    },
  ],
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          layer1: {
            columnOrder: ['col1', 'col2'],
            columns: {
              col2: {
                dataType: 'number',
                isBucketed: false,
                label: 'Count of records',
                operationType: 'count',
                scale: 'ratio',
                sourceField: '___records___',
              },
              col1: {
                dataType: 'date',
                isBucketed: true,
                label: '@timestamp',
                operationType: 'date_histogram',
                params: {
                  interval: 'auto',
                },
                scale: 'interval',
                sourceField: 'timestamp',
              },
            },
          },
        },
      },
    },
    filters: [],
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
      fittingFunction: 'None',
      gridlinesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      layers: [
        {
          accessors: ['col2'],
          layerId: 'layer1',
          layerType: 'data',
          seriesType: 'line',
          xAccessor: 'col1',
          yConfig: [
            {
              forAccessor: 'col2',
              color: '#54B399',
            },
          ],
        },
      ],
      legend: {
        isVisible: true,
        position: 'right',
      },
      preferredSeriesType: 'line',
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      valueLabels: 'hide',
    },
  },
  visualizationType: 'lnsXY',
} as TypedLensByValueInput['attributes'];
