/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HeatmapVisualizationState } from '@kbn/lens-common/visualizations/heatmap/types';

import type { LensAttributes } from '../../types';

export const simple: LensAttributes = {
  title: 'Lens Heatmap - DSL - Simple',
  description: 'Count of records with timestamp on x-axis',
  state: {
    visualization: {
      shape: 'heatmap',
      layerId: '1df843f3-7796-4cef-a87d-babfbb85cd37',
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
        isYAxisTitleVisible: true,
        isXAxisTitleVisible: true,
      },
      valueAccessor: 'e43d2fd3-5fdc-43c6-94db-d4ed285ebaff',
      xAccessor: '290700e9-5d95-43f4-a22f-00f688499b9d',
    } satisfies HeatmapVisualizationState,
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '1df843f3-7796-4cef-a87d-babfbb85cd37': {
            columns: {
              '290700e9-5d95-43f4-a22f-00f688499b9d': {
                label: 'timestamp',
                dataType: 'date',
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                isBucketed: true,
                params: {
                  // @ts-expect-error
                  interval: 'auto',
                  includeEmptyRows: true,
                  dropPartials: false,
                },
              },
              'e43d2fd3-5fdc-43c6-94db-d4ed285ebaff': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                sourceField: '___records___',
                params: {
                  // @ts-expect-error
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              '290700e9-5d95-43f4-a22f-00f688499b9d',
              'e43d2fd3-5fdc-43c6-94db-d4ed285ebaff',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
      // @ts-expect-error
      indexpattern: {
        layers: {},
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
  version: 2,
  visualizationType: 'lnsHeatmap',
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-1df843f3-7796-4cef-a87d-babfbb85cd37',
    },
  ],
} satisfies LensAttributes;

export const withXAndYAxes: LensAttributes = {
  title: 'Lens Heatmap - DSL - With X and Y Axes',
  description: 'Count of records with timestamp on x-axis and extension.keyword on y-axis',
  state: {
    visualization: {
      shape: 'heatmap',
      layerId: '1df843f3-7796-4cef-a87d-babfbb85cd37',
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
        isYAxisTitleVisible: true,
        isXAxisTitleVisible: true,
      },
      valueAccessor: 'd6e6d271-522a-4a86-ba6f-f2532b0d19c8',
      xAccessor: 'b89060f1-221d-439a-8364-517495ea1bdb',
      yAccessor: '5a61cc15-ac82-4b52-954b-71441a91d7ca',
    } satisfies HeatmapVisualizationState,
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '1df843f3-7796-4cef-a87d-babfbb85cd37': {
            columns: {
              'b89060f1-221d-439a-8364-517495ea1bdb': {
                label: '@timestamp',
                dataType: 'date',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                isBucketed: true,
                params: {
                  // @ts-expect-error
                  interval: 'auto',
                  includeEmptyRows: true,
                  dropPartials: false,
                },
              },
              'd6e6d271-522a-4a86-ba6f-f2532b0d19c8': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                sourceField: '___records___',
                params: {
                  // @ts-expect-error
                  emptyAsNull: true,
                },
              },
              '5a61cc15-ac82-4b52-954b-71441a91d7ca': {
                label: 'Top 3 values of extension.keyword',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'extension.keyword',
                isBucketed: true,
                params: {
                  // @ts-expect-error
                  size: 3,
                  orderBy: {
                    type: 'column',
                    columnId: 'd6e6d271-522a-4a86-ba6f-f2532b0d19c8',
                  },
                  orderDirection: 'desc',
                  otherBucket: true,
                  missingBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  include: [],
                  exclude: [],
                  includeIsRegex: false,
                  excludeIsRegex: false,
                },
              },
            },
            columnOrder: [
              'b89060f1-221d-439a-8364-517495ea1bdb',
              '5a61cc15-ac82-4b52-954b-71441a91d7ca',
              'd6e6d271-522a-4a86-ba6f-f2532b0d19c8',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
      // @ts-expect-error
      indexpattern: {
        layers: {},
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
  version: 2,
  visualizationType: 'lnsHeatmap',
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-1df843f3-7796-4cef-a87d-babfbb85cd37',
    },
  ],
} satisfies LensAttributes;

export const withDynamicColors: LensAttributes = {
  title: 'Lens Heatmap - DSL - With Dynamic Colors',
  description: 'Count of records with timestamp on x-axis and extension.keyword on y-axis',
  state: {
    visualization: {
      shape: 'heatmap',
      layerId: 'e016676a-c659-4af1-bd71-52a1e5fb37f7',
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
      valueAccessor: 'd8ef3452-490c-45e3-9505-e44b562b9f1d',
      xAccessor: 'd3c84acd-c8c9-4933-9990-c47833e841a3',
      yAccessor: 'd3c6a135-31a8-4dc0-b7a2-027ac433333c',
      palette: {
        name: 'custom',
        type: 'palette',
        params: {
          steps: 5,
          name: 'custom',
          colorStops: [
            {
              color: '#24c292',
              stop: 1,
            },
            {
              color: '#aee8d2',
              stop: 8,
            },
            {
              color: '#fcd883',
              stop: 15,
            },
            {
              color: '#ffc9c2',
              stop: 22,
            },
            {
              color: '#f6726a',
              stop: 29,
            },
          ],
          continuity: 'above',
          reverse: false,
          stops: [
            {
              color: '#24c292',
              stop: 8,
            },
            {
              color: '#aee8d2',
              stop: 15,
            },
            {
              color: '#fcd883',
              stop: 22,
            },
            {
              color: '#ffc9c2',
              stop: 29,
            },
            {
              color: '#f6726a',
              stop: 36,
            },
          ],
          rangeMin: 1,
          rangeMax: null,
          rangeType: 'number',
        },
        accessor: 'd8ef3452-490c-45e3-9505-e44b562b9f1d',
      },
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          'e016676a-c659-4af1-bd71-52a1e5fb37f7': {
            columns: {
              'd3c84acd-c8c9-4933-9990-c47833e841a3': {
                label: 'timestamp',
                dataType: 'date',
                operationType: 'date_histogram',
                sourceField: 'timestamp',
                isBucketed: true,
                params: {
                  // @ts-expect-error
                  interval: 'auto',
                  includeEmptyRows: true,
                  dropPartials: false,
                },
              },
              'd8ef3452-490c-45e3-9505-e44b562b9f1d': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                sourceField: '___records___',
                params: {
                  // @ts-expect-error
                  emptyAsNull: true,
                },
              },
              'd3c6a135-31a8-4dc0-b7a2-027ac433333c': {
                label: 'Top 3 values of extension.keyword',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'extension.keyword',
                isBucketed: true,
                params: {
                  // @ts-expect-error
                  size: 3,
                  orderBy: {
                    type: 'column',
                    columnId: 'd8ef3452-490c-45e3-9505-e44b562b9f1d',
                  },
                  orderDirection: 'desc',
                  otherBucket: true,
                  missingBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  include: [],
                  exclude: [],
                  includeIsRegex: false,
                  excludeIsRegex: false,
                },
              },
            },
            columnOrder: [
              'd3c6a135-31a8-4dc0-b7a2-027ac433333c',
              'd3c84acd-c8c9-4933-9990-c47833e841a3',
              'd8ef3452-490c-45e3-9505-e44b562b9f1d',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
      // @ts-expect-error
      indexpattern: {
        layers: {},
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
  version: 2,
  visualizationType: 'lnsHeatmap',
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-e016676a-c659-4af1-bd71-52a1e5fb37f7',
    },
  ],
} satisfies LensAttributes;
