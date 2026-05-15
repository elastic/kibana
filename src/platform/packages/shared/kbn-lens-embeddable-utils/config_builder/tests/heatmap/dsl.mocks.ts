/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HeatmapVisualizationState } from '@kbn/lens-common/visualizations/heatmap/types';

import { LENS_ITEM_LATEST_VERSION } from '@kbn/lens-common/content_management/constants';
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
  version: LENS_ITEM_LATEST_VERSION,
  visualizationType: 'lnsHeatmap',
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-1df843f3-7796-4cef-a87d-babfbb85cd37',
    },
  ],
} satisfies LensAttributes;

export const withXAndYAxes = {
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
  version: LENS_ITEM_LATEST_VERSION,
  visualizationType: 'lnsHeatmap',
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-1df843f3-7796-4cef-a87d-babfbb85cd37',
    },
  ],
} satisfies LensAttributes;

export const withSortPredicates = {
  ...withXAndYAxes,
  title: 'Lens Heatmap - DSL - With Sort Predicates',
  description: 'Heatmap with x-axis ascending and y-axis descending sort',
  state: {
    ...withXAndYAxes.state,
    visualization: {
      ...withXAndYAxes.state.visualization,
      gridConfig: {
        ...withXAndYAxes.state.visualization.gridConfig,
        xSortPredicate: 'asc',
        ySortPredicate: 'desc',
      },
    },
  },
} satisfies LensAttributes;

export const withDynamicColors = {
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
        shouldTruncate: false,
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
  version: LENS_ITEM_LATEST_VERSION,
  visualizationType: 'lnsHeatmap',
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-e016676a-c659-4af1-bd71-52a1e5fb37f7',
    },
  ],
} satisfies LensAttributes;

export const defaultColorByValueAttributes: LensAttributes = {
  description: '',
  state: {
    visualization: {
      shape: 'heatmap',
      layerId: '4153c826-5f82-4fb5-942b-5947250e8b58',
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
      valueAccessor: '756ec9bf-a53b-4b87-b9d4-02b8ae209460',
      xAccessor: 'edf4ef67-7e54-4a9e-ab15-b72970b606d1',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '4153c826-5f82-4fb5-942b-5947250e8b58': {
            columns: {
              'edf4ef67-7e54-4a9e-ab15-b72970b606d1': {
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
              '756ec9bf-a53b-4b87-b9d4-02b8ae209460': {
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
              'edf4ef67-7e54-4a9e-ab15-b72970b606d1',
              '756ec9bf-a53b-4b87-b9d4-02b8ae209460',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
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
  title: 'testing color by value palette',
  version: LENS_ITEM_LATEST_VERSION,
  visualizationType: 'lnsHeatmap',
  references: [
    {
      type: 'index-pattern',
      id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      name: 'indexpattern-datasource-layer-4153c826-5f82-4fb5-942b-5947250e8b58',
    },
  ],
};

export const selectorColorByValueAttributes: LensAttributes = {
  description: '',
  state: {
    visualization: {
      shape: 'heatmap',
      layerId: '4153c826-5f82-4fb5-942b-5947250e8b58',
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
      valueAccessor: '756ec9bf-a53b-4b87-b9d4-02b8ae209460',
      xAccessor: 'edf4ef67-7e54-4a9e-ab15-b72970b606d1',
      palette: {
        type: 'palette',
        name: 'status',
        params: {
          name: 'status',
          continuity: 'above',
          reverse: false,
          stops: [
            {
              color: '#24c292',
              stop: 0,
            },
            {
              color: '#aee8d2',
              stop: 20,
            },
            {
              color: '#fcd883',
              stop: 40,
            },
            {
              color: '#ffc9c2',
              stop: 60,
            },
            {
              color: '#f6726a',
              stop: 80,
            },
          ],
          rangeMin: 0,
          rangeMax: null,
        },
        accessor: '756ec9bf-a53b-4b87-b9d4-02b8ae209460',
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
          '4153c826-5f82-4fb5-942b-5947250e8b58': {
            columns: {
              'edf4ef67-7e54-4a9e-ab15-b72970b606d1': {
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
              '756ec9bf-a53b-4b87-b9d4-02b8ae209460': {
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
              'edf4ef67-7e54-4a9e-ab15-b72970b606d1',
              '756ec9bf-a53b-4b87-b9d4-02b8ae209460',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
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
  title: 'testing color by value palette',
  version: LENS_ITEM_LATEST_VERSION,
  visualizationType: 'lnsHeatmap',
  references: [
    {
      type: 'index-pattern',
      id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      name: 'indexpattern-datasource-layer-4153c826-5f82-4fb5-942b-5947250e8b58',
    },
  ],
};

export const formulaColumns: LensAttributes = {
  state: {
    visualization: {
      shape: 'heatmap',
      layerId: '76ecf220-01ab-4916-b92d-3507abef5ff0',
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
      valueAccessor: '7a266ca9-ff64-4ef2-a303-e5a1f34db73a',
      xAccessor: '58ee0496-7acc-4774-9db1-25d227f8392c',
      yAccessor: '1c024881-94fe-4572-89fa-9ed9d289f127',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '76ecf220-01ab-4916-b92d-3507abef5ff0': {
            columns: {
              '58ee0496-7acc-4774-9db1-25d227f8392c': {
                label: 'Top 9 values of geo.srcdest',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.srcdest',
                isBucketed: true,
                params: {
                  // @ts-expect-error
                  size: 9,
                  orderBy: {
                    type: 'alphabetical',
                    fallback: true,
                  },
                  orderDirection: 'asc',
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
              '1c024881-94fe-4572-89fa-9ed9d289f127': {
                label: 'Top 9 values of extension.keyword',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'extension.keyword',
                isBucketed: true,
                params: {
                  // @ts-expect-error
                  size: 9,
                  orderBy: {
                    type: 'alphabetical',
                    fallback: true,
                  },
                  orderDirection: 'asc',
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
              '7a266ca9-ff64-4ef2-a303-e5a1f34db73aX0': {
                label: 'Part of max(bytes) + sum(bytes)',
                dataType: 'number',
                operationType: 'max',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  emptyAsNull: false,
                },
                customLabel: true,
              },
              '7a266ca9-ff64-4ef2-a303-e5a1f34db73aX1': {
                label: 'Part of max(bytes) + sum(bytes)',
                dataType: 'number',
                operationType: 'sum',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  emptyAsNull: false,
                },
                customLabel: true,
              },
              '7a266ca9-ff64-4ef2-a303-e5a1f34db73aX2': {
                label: 'Part of max(bytes) + sum(bytes)',
                dataType: 'number',
                operationType: 'math',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  tinymathAst: {
                    type: 'function',
                    name: 'add',
                    args: [
                      '7a266ca9-ff64-4ef2-a303-e5a1f34db73aX0',
                      '7a266ca9-ff64-4ef2-a303-e5a1f34db73aX1',
                    ],
                    location: {
                      min: 0,
                      max: 23,
                    },
                    text: 'max(bytes) + sum(bytes)',
                  },
                },
                references: [
                  '7a266ca9-ff64-4ef2-a303-e5a1f34db73aX0',
                  '7a266ca9-ff64-4ef2-a303-e5a1f34db73aX1',
                ],
                customLabel: true,
              },
              '7a266ca9-ff64-4ef2-a303-e5a1f34db73a': {
                label: 'max(bytes) + sum(bytes)',
                dataType: 'number',
                operationType: 'formula',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  formula: 'max(bytes) + sum(bytes)',
                  isFormulaBroken: false,
                },
                references: ['7a266ca9-ff64-4ef2-a303-e5a1f34db73aX2'],
              },
            },
            columnOrder: [
              '1c024881-94fe-4572-89fa-9ed9d289f127',
              '58ee0496-7acc-4774-9db1-25d227f8392c',
              '7a266ca9-ff64-4ef2-a303-e5a1f34db73a',
              '7a266ca9-ff64-4ef2-a303-e5a1f34db73aX0',
              '7a266ca9-ff64-4ef2-a303-e5a1f34db73aX1',
              '7a266ca9-ff64-4ef2-a303-e5a1f34db73aX2',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
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
  title: 'Heatmap with formula',
  description: '',
  version: 2,
  visualizationType: 'lnsHeatmap',
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-76ecf220-01ab-4916-b92d-3507abef5ff0',
    },
  ],
};
