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
  LastValueIndexPatternColumn,
  RangeIndexPatternColumn,
} from '@kbn/lens-common';
import type { LensAttributes } from '../../types';

export const referenceLineXY: LensAttributes = {
  visualizationType: 'lnsXY',
  title: 'Lens title',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4': {
            columnOrder: [
              '315033e2-8172-4213-87e0-d4e7f09ccca7',
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
            ],
            columns: {
              '315033e2-8172-4213-87e0-d4e7f09ccca7': {
                isBucketed: true,
                dataType: 'date',
                label: '@timestamp',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                params: {
                  interval: 'auto',
                },
              } as DateHistogramIndexPatternColumn,
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50': {
                isBucketed: false,
                dataType: 'number',
                operationType: 'count',
                sourceField: '___records___',
                label: 'Count of Records',
              },
            },
          },
          '350803f8-7a8f-4b45-a509-94b9f6baf73c': {
            columnOrder: ['d661ac91-a1bc-45cc-bd62-b01cdf81199f'],
            columns: {
              'd661ac91-a1bc-45cc-bd62-b01cdf81199f': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: '',
                },
                isBucketed: false,
                label: 'Errors',
                operationType: 'last_value',
                params: {
                  format: {
                    id: 'number',
                    params: {
                      decimals: 0,
                    },
                  },
                  sortField: '@timestamp',
                },
                scale: 'ratio',
                sourceField: 'total',
              } as LastValueIndexPatternColumn,
            },
            ignoreGlobalFilters: false,
            incompleteColumns: {},
            linkToLayers: [],
            sampling: 1,
          },
        },
      },
    },
    visualization: {
      layers: [
        {
          accessors: ['dc5b22e3-48ef-447d-a0e5-60fdad78cf50'],
          isHistogram: true,
          layerId: '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
          layerType: 'data',
          seriesType: 'line',
          xAccessor: '315033e2-8172-4213-87e0-d4e7f09ccca7',
        },
        {
          accessors: ['d661ac91-a1bc-45cc-bd62-b01cdf81199f'],
          layerId: '350803f8-7a8f-4b45-a509-94b9f6baf73c',
          layerType: 'referenceLine',
          yConfig: [
            {
              axisMode: 'left',
              color: '#e5281e',
              forAccessor: 'd661ac91-a1bc-45cc-bd62-b01cdf81199f',
            },
          ],
        },
      ],
      legend: {
        isVisible: true,
        position: 'right',
      },
      preferredSeriesType: 'bar_stacked',
    },
    filters: [],
    query: {
      query: '',
      language: 'kuery',
    },
  },
  references: [
    {
      id: 'logs-*',
      name: 'indexpattern-datasource-layer-5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
      type: 'index-pattern',
    },
    {
      id: 'metrics-*',
      name: 'indexpattern-datasource-layer-350803f8-7a8f-4b45-a509-94b9f6baf73c',
      type: 'index-pattern',
    },
  ],
};

export const dualReferenceLineXY: LensAttributes = {
  visualizationType: 'lnsXY',
  title: 'Lens title',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4': {
            columnOrder: [
              '315033e2-8172-4213-87e0-d4e7f09ccca7',
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
            ],
            columns: {
              '315033e2-8172-4213-87e0-d4e7f09ccca7': {
                isBucketed: true,
                dataType: 'number',
                label: 'bytes',
                operationType: 'range',
                sourceField: 'bytes',
                params: {
                  type: 'histogram',
                  maxBars: 7,
                },
              } as RangeIndexPatternColumn,
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50': {
                isBucketed: false,
                dataType: 'number',
                operationType: 'count',
                sourceField: '___records___',
                label: 'Count of Records',
              },
            },
          },
          '350803f8-7a8f-4b45-a509-94b9f6baf73c': {
            columnOrder: ['d661ac91-a1bc-45cc-bd62-b01cdf81199f'],
            columns: {
              'd661ac91-a1bc-45cc-bd62-b01cdf81199f': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: '',
                },
                isBucketed: false,
                label: 'Errors',
                operationType: 'last_value',
                params: {
                  format: {
                    id: 'number',
                    params: {
                      decimals: 0,
                    },
                  },
                  sortField: '@timestamp',
                },
                scale: 'ratio',
                sourceField: 'total',
              } as LastValueIndexPatternColumn,
              'd661ac91-a1bc-45cc-bd62-b01cdf81199a': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: '',
                },
                isBucketed: false,
                label: 'Errors',
                operationType: 'last_value',
                params: {
                  format: {
                    id: 'number',
                    params: {
                      decimals: 0,
                    },
                  },
                  sortField: '@timestamp',
                },
                scale: 'ratio',
                sourceField: 'total',
              } as LastValueIndexPatternColumn,
            },
            ignoreGlobalFilters: false,
            incompleteColumns: {},
            linkToLayers: [],
            sampling: 1,
          },
        },
      },
    },
    visualization: {
      layers: [
        {
          accessors: ['dc5b22e3-48ef-447d-a0e5-60fdad78cf50'],
          isHistogram: true,
          layerId: '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
          layerType: 'data',
          seriesType: 'line',
          xAccessor: '315033e2-8172-4213-87e0-d4e7f09ccca7',
        },
        {
          accessors: [
            'd661ac91-a1bc-45cc-bd62-b01cdf81199f',
            'd661ac91-a1bc-45cc-bd62-b01cdf81199a',
          ],
          layerId: '350803f8-7a8f-4b45-a509-94b9f6baf73c',
          layerType: 'referenceLine',
          yConfig: [
            {
              axisMode: 'left',
              color: '#e5281e',
              forAccessor: 'd661ac91-a1bc-45cc-bd62-b01cdf81199f',
            },
            {
              axisMode: 'bottom',
              color: '#e5281e',
              forAccessor: 'd661ac91-a1bc-45cc-bd62-b01cdf81199a',
            },
          ],
        },
      ],
      legend: {
        isVisible: true,
        position: 'right',
      },
      preferredSeriesType: 'bar_stacked',
    },
    filters: [],
    query: {
      query: '',
      language: 'kuery',
    },
  },
  references: [
    {
      id: 'logs-*',
      name: 'indexpattern-datasource-layer-5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
      type: 'index-pattern',
    },
    {
      id: 'metrics-*',
      name: 'indexpattern-datasource-layer-350803f8-7a8f-4b45-a509-94b9f6baf73c',
      type: 'index-pattern',
    },
  ],
};
