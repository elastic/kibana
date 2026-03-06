/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensAttributes } from '../../types';

export const pieLegacyBasicState = {
  description: '',
  state: {
    visualization: {
      shape: 'pie',
      layers: [
        {
          layerId: '95564f97-f026-46d7-bbd0-3bbd42877c71',
          primaryGroups: ['1d02d55f-cbf9-42e0-a3d8-96be5c0026dc'],
          metrics: ['380bf1bd-7b28-4599-959c-137a78e38763'],
          numberDisplay: 'percent',
          categoryDisplay: 'default',
          legendDisplay: 'default',
          nestedLegend: false,
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
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '95564f97-f026-46d7-bbd0-3bbd42877c71': {
            columns: {
              '1d02d55f-cbf9-42e0-a3d8-96be5c0026dc': {
                label: 'Top 3 values of tags.keyword',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'tags.keyword',
                isBucketed: true,
                params: {
                  size: 3,
                  orderBy: {
                    type: 'column',
                    columnId: '380bf1bd-7b28-4599-959c-137a78e38763',
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
              '380bf1bd-7b28-4599-959c-137a78e38763': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                sourceField: '___records___',
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              '1d02d55f-cbf9-42e0-a3d8-96be5c0026dc',
              '380bf1bd-7b28-4599-959c-137a78e38763',
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
  title: 'Partition baseline',
  version: 2,
  visualizationType: 'lnsPie',
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-95564f97-f026-46d7-bbd0-3bbd42877c71',
    },
  ],
} as LensAttributes;

export const treemapLegacyBasicState = {
  visualizationType: 'lnsPie',
  title: '',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          layer_0: {
            columns: {
              partition_value_accessor_group_by_0: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'tags.keyword',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_metric_0: {
                operationType: 'count',
                sourceField: '___records___',
                dataType: 'number',
                isBucketed: false,
                label: '',
                customLabel: false,
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              'partition_value_accessor_group_by_0',
              'partition_value_accessor_metric_0',
            ],
          },
        },
      },
    },
    visualization: {
      shape: 'treemap',
      layers: [
        {
          metrics: ['partition_value_accessor_metric_0'],
          primaryGroups: ['partition_value_accessor_group_by_0'],
          allowMultipleMetrics: false,
          layerId: 'layer_0',
          layerType: 'data',
          numberDisplay: 'percent',
          legendDisplay: 'default',
          nestedLegend: true,
          collapseFns: {},
          categoryDisplay: 'default',
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
  },
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-layer_0',
    },
  ],
} as LensAttributes;

export const mosaicLegacyBasicState = {
  visualizationType: 'lnsPie',
  title: '',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          layer_0: {
            columns: {
              partition_value_accessor_group_by_0: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'tags.keyword',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_metric_0: {
                operationType: 'count',
                sourceField: '___records___',
                dataType: 'number',
                isBucketed: false,
                label: '',
                customLabel: false,
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              'partition_value_accessor_group_by_0',
              'partition_value_accessor_metric_0',
            ],
          },
        },
      },
    },
    visualization: {
      shape: 'mosaic',
      layers: [
        {
          metrics: ['partition_value_accessor_metric_0'],
          primaryGroups: ['partition_value_accessor_group_by_0'],
          secondaryGroups: [],
          allowMultipleMetrics: false,
          layerId: 'layer_0',
          layerType: 'data',
          numberDisplay: 'percent',
          legendDisplay: 'default',
          nestedLegend: true,
          collapseFns: {},
          categoryDisplay: 'default',
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
  },
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-layer_0',
    },
  ],
} as LensAttributes;

export const waffleLegacyBasicState = {
  visualizationType: 'lnsPie',
  title: '',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          layer_0: {
            columns: {
              partition_value_accessor_group_by_0: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'tags.keyword',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_metric_0: {
                operationType: 'count',
                sourceField: '___records___',
                dataType: 'number',
                isBucketed: false,
                label: '',
                customLabel: false,
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              'partition_value_accessor_group_by_0',
              'partition_value_accessor_metric_0',
            ],
          },
        },
      },
    },
    visualization: {
      shape: 'waffle',
      layers: [
        {
          metrics: ['partition_value_accessor_metric_0'],
          primaryGroups: ['partition_value_accessor_group_by_0'],
          allowMultipleMetrics: false,
          layerId: 'layer_0',
          layerType: 'data',
          numberDisplay: 'percent',
          legendDisplay: 'default',
          nestedLegend: true,
          collapseFns: {},
          categoryDisplay: 'default',
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
  },
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-layer_0',
    },
  ],
} as LensAttributes;

export const pieLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups = {
  visualizationType: 'lnsPie',
  title: '',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          layer_0: {
            columns: {
              partition_value_accessor_group_by_0: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'tags.keyword',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_group_by_1: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'geo.dest',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_group_by_2: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'clientip',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_metric_0: {
                operationType: 'count',
                sourceField: '___records___',
                dataType: 'number',
                isBucketed: false,
                label: '',
                customLabel: false,
                params: {
                  emptyAsNull: true,
                },
              },
              partition_value_accessor_metric_1: {
                operationType: 'count',
                sourceField: '___records___',
                dataType: 'number',
                isBucketed: false,
                label: '',
                customLabel: false,
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              'partition_value_accessor_group_by_0',
              'partition_value_accessor_group_by_1',
              'partition_value_accessor_group_by_2',
              'partition_value_accessor_metric_0',
              'partition_value_accessor_metric_1',
            ],
          },
        },
      },
    },
    visualization: {
      shape: 'donut',
      layers: [
        {
          metrics: ['partition_value_accessor_metric_0', 'partition_value_accessor_metric_1'],
          primaryGroups: [
            'partition_value_accessor_group_by_0',
            'partition_value_accessor_group_by_1',
            'partition_value_accessor_group_by_2',
          ],
          allowMultipleMetrics: true,
          layerId: 'layer_0',
          layerType: 'data',
          numberDisplay: 'percent',
          legendDisplay: 'default',
          nestedLegend: true,
          collapseFns: {
            partition_value_accessor_group_by_0: 'sum',
          },
          colorMapping: {
            colorMode: {
              type: 'categorical',
            },
            paletteId: 'default',
            assignments: [
              {
                rules: [
                  {
                    type: 'raw',
                    value: 'success',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 6,
                },
                touched: false,
              },
              {
                rules: [
                  {
                    type: 'raw',
                    value: 'info',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 9,
                },
                touched: false,
              },
              {
                rules: [
                  {
                    type: 'raw',
                    value: 'security',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 4,
                },
                touched: false,
              },
              {
                rules: [
                  {
                    type: 'raw',
                    value: '__other__',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 5,
                },
                touched: false,
              },
            ],
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
          },
          categoryDisplay: 'default',
          emptySizeRatio: 0.54,
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
  },
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-layer_0',
    },
  ],
} as LensAttributes;

export const treemapLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups = {
  visualizationType: 'lnsPie',
  title: '',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          layer_0: {
            columns: {
              partition_value_accessor_group_by_0: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'tags.keyword',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_group_by_1: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'geo.dest',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_metric_0: {
                operationType: 'count',
                sourceField: '___records___',
                dataType: 'number',
                isBucketed: false,
                label: '',
                customLabel: false,
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              'partition_value_accessor_group_by_0',
              'partition_value_accessor_group_by_1',
              'partition_value_accessor_metric_0',
            ],
          },
        },
      },
    },
    visualization: {
      shape: 'treemap',
      layers: [
        {
          metrics: ['partition_value_accessor_metric_0'],
          primaryGroups: [
            'partition_value_accessor_group_by_0',
            'partition_value_accessor_group_by_1',
          ],
          allowMultipleMetrics: false,
          layerId: 'layer_0',
          layerType: 'data',
          numberDisplay: 'percent',
          legendDisplay: 'default',
          nestedLegend: true,
          collapseFns: {
            partition_value_accessor_group_by_0: 'sum',
          },
          colorMapping: {
            colorMode: {
              type: 'categorical',
            },
            paletteId: 'default',
            assignments: [
              {
                rules: [
                  {
                    type: 'raw',
                    value: 'success',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 6,
                },
                touched: false,
              },
              {
                rules: [
                  {
                    type: 'raw',
                    value: 'info',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 9,
                },
                touched: false,
              },
              {
                rules: [
                  {
                    type: 'raw',
                    value: 'security',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 4,
                },
                touched: false,
              },
              {
                rules: [
                  {
                    type: 'raw',
                    value: '__other__',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 5,
                },
                touched: false,
              },
            ],
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
          },
          categoryDisplay: 'default',
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
  },
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-layer_0',
    },
  ],
} as LensAttributes;

export const mosaicLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups = {
  visualizationType: 'lnsPie',
  title: '',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          layer_0: {
            columns: {
              partition_value_accessor_group_by_0: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'tags.keyword',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_group_by_1: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'geo.dest',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_group_breakdown_by_0: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'clientip',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_metric_0: {
                operationType: 'count',
                sourceField: '___records___',
                dataType: 'number',
                isBucketed: false,
                label: '',
                customLabel: false,
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              'partition_value_accessor_group_by_0',
              'partition_value_accessor_group_by_1',
              'partition_value_accessor_group_breakdown_by_0',
              'partition_value_accessor_metric_0',
            ],
          },
        },
      },
    },
    visualization: {
      shape: 'mosaic',
      layers: [
        {
          metrics: ['partition_value_accessor_metric_0'],
          primaryGroups: [
            'partition_value_accessor_group_by_0',
            'partition_value_accessor_group_by_1',
          ],
          secondaryGroups: ['partition_value_accessor_group_breakdown_by_0'],
          allowMultipleMetrics: false,
          layerId: 'layer_0',
          layerType: 'data',
          numberDisplay: 'percent',
          legendDisplay: 'default',
          nestedLegend: true,
          collapseFns: {
            partition_value_accessor_group_by_0: 'sum',
          },
          colorMapping: {
            colorMode: {
              type: 'categorical',
            },
            paletteId: 'default',
            assignments: [
              {
                rules: [
                  {
                    type: 'raw',
                    value: 'success',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 6,
                },
                touched: false,
              },
              {
                rules: [
                  {
                    type: 'raw',
                    value: 'info',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 9,
                },
                touched: false,
              },
              {
                rules: [
                  {
                    type: 'raw',
                    value: 'security',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 4,
                },
                touched: false,
              },
              {
                rules: [
                  {
                    type: 'raw',
                    value: '__other__',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 5,
                },
                touched: false,
              },
            ],
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
          },
          categoryDisplay: 'default',
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
  },
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-layer_0',
    },
  ],
} as LensAttributes;

export const waffleLegacyAdvancedStateWithCollapsedGroups = {
  visualizationType: 'lnsPie',
  title: '',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          layer_0: {
            columns: {
              partition_value_accessor_group_by_0: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'tags.keyword',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_group_by_1: {
                operationType: 'terms',
                dataType: 'string',
                sourceField: 'tags.keyword',
                label: '',
                customLabel: false,
                isBucketed: true,
                params: {
                  size: 3,
                  otherBucket: true,
                  missingBucket: false,
                  orderBy: {
                    type: 'column',
                    columnId: 'partition_value_accessor_metric_0',
                  },
                  orderDirection: 'desc',
                  parentFormat: {
                    id: 'terms',
                  },
                },
              },
              partition_value_accessor_metric_0: {
                operationType: 'count',
                sourceField: '___records___',
                dataType: 'number',
                isBucketed: false,
                label: '',
                customLabel: false,
                params: {
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              'partition_value_accessor_group_by_0',
              'partition_value_accessor_group_by_1',
              'partition_value_accessor_metric_0',
            ],
          },
        },
      },
    },
    visualization: {
      shape: 'waffle',
      layers: [
        {
          metrics: ['partition_value_accessor_metric_0'],
          primaryGroups: [
            'partition_value_accessor_group_by_0',
            'partition_value_accessor_group_by_1',
          ],
          allowMultipleMetrics: false,
          layerId: 'layer_0',
          layerType: 'data',
          numberDisplay: 'percent',
          legendDisplay: 'default',
          nestedLegend: true,
          collapseFns: {
            partition_value_accessor_group_by_0: 'sum',
          },
          colorMapping: {
            colorMode: {
              type: 'categorical',
            },
            paletteId: 'default',
            assignments: [
              {
                rules: [
                  {
                    type: 'raw',
                    value: 'success',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 6,
                },
                touched: false,
              },
              {
                rules: [
                  {
                    type: 'raw',
                    value: 'info',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 9,
                },
                touched: false,
              },
              {
                rules: [
                  {
                    type: 'raw',
                    value: 'security',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 4,
                },
                touched: false,
              },
              {
                rules: [
                  {
                    type: 'raw',
                    value: '__other__',
                  },
                ],
                color: {
                  type: 'categorical',
                  paletteId: 'default',
                  colorIndex: 5,
                },
                touched: false,
              },
            ],
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
          },
          categoryDisplay: 'default',
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
  },
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-layer_0',
    },
  ],
} as LensAttributes;

export const pieLegacyESQLState = {
  visualizationType: 'lnsPie',
  title: 'Bar vertical stacked',
  state: {
    datasourceStates: {
      textBased: {
        layers: {
          layer_0: {
            index: 'kibana_sample_data_ecommerce',
            query: {
              esql: 'FROM kibana_sample_data_ecommerce \n| STATS count = COUNT(*) by category',
            },
            columns: [
              {
                columnId: 'partition_value_accessor_metric_0',
                fieldName: 'count',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'partition_value_accessor_group_by_0',
                fieldName: 'category',
                meta: {
                  type: 'string',
                },
              },
            ],
          },
        },
      },
    },
    internalReferences: [
      {
        type: 'index-pattern',
        id: 'kibana_sample_data_ecommerce-no_time_field',
        name: 'indexpattern-datasource-layer-layer_0',
      },
    ],
    visualization: {
      shape: 'pie',
      layers: [
        {
          metrics: ['partition_value_accessor_metric_0'],
          primaryGroups: ['partition_value_accessor_group_by_0'],
          allowMultipleMetrics: false,
          layerId: 'layer_0',
          layerType: 'data',
          numberDisplay: 'percent',
          legendDisplay: 'default',
          nestedLegend: false,
          collapseFns: {},
          colorMapping: {
            colorMode: {
              type: 'categorical',
            },
            paletteId: 'default',
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
          },
          categoryDisplay: 'default',
        },
      ],
    },
    adHocDataViews: {
      'kibana_sample_data_ecommerce-no_time_field': {
        id: 'kibana_sample_data_ecommerce-no_time_field',
        title: 'kibana_sample_data_ecommerce',
        name: 'kibana_sample_data_ecommerce',
        sourceFilters: [],
        fieldFormats: {},
        runtimeFieldMap: {},
        fieldAttrs: {},
        allowNoIndex: false,
        allowHidden: false,
      },
    },
    query: {
      esql: 'FROM kibana_sample_data_ecommerce \n| STATS count = COUNT(*) by category',
    },
    filters: [],
  },
  references: [],
} as LensAttributes;
export const treemapLegacyESQLState = {
  visualizationType: 'lnsPie',
  title: 'Bar vertical stacked',
  state: {
    datasourceStates: {
      textBased: {
        layers: {
          layer_0: {
            index: 'kibana_sample_data_ecommerce',
            query: {
              esql: 'FROM kibana_sample_data_ecommerce \n| STATS count = COUNT(*) by category ',
            },
            columns: [
              {
                columnId: 'partition_value_accessor_metric_0',
                fieldName: 'count',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'partition_value_accessor_group_by_0',
                fieldName: 'category',
                meta: {
                  type: 'string',
                },
              },
            ],
          },
        },
      },
    },
    internalReferences: [
      {
        type: 'index-pattern',
        id: 'kibana_sample_data_ecommerce-no_time_field',
        name: 'indexpattern-datasource-layer-layer_0',
      },
    ],
    visualization: {
      shape: 'treemap',
      layers: [
        {
          metrics: ['partition_value_accessor_metric_0'],
          primaryGroups: ['partition_value_accessor_group_by_0'],
          allowMultipleMetrics: false,
          layerId: 'layer_0',
          layerType: 'data',
          numberDisplay: 'percent',
          legendDisplay: 'default',
          nestedLegend: false,
          collapseFns: {},
          colorMapping: {
            colorMode: {
              type: 'categorical',
            },
            paletteId: 'default',
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
          },
          categoryDisplay: 'default',
        },
      ],
    },
    adHocDataViews: {
      'kibana_sample_data_ecommerce-no_time_field': {
        id: 'kibana_sample_data_ecommerce-no_time_field',
        title: 'kibana_sample_data_ecommerce',
        name: 'kibana_sample_data_ecommerce',
        sourceFilters: [],
        fieldFormats: {},
        runtimeFieldMap: {},
        fieldAttrs: {},
        allowNoIndex: false,
        allowHidden: false,
      },
    },
    query: {
      esql: 'FROM kibana_sample_data_ecommerce \n| STATS count = COUNT(*) by category ',
    },
    filters: [],
  },
  references: [],
} as LensAttributes;
export const mosaicLegacyESQLState = {
  visualizationType: 'lnsPie',
  title: 'Bar vertical stacked',
  state: {
    datasourceStates: {
      textBased: {
        layers: {
          layer_0: {
            index: 'kibana_sample_data_ecommerce',
            query: {
              esql: 'FROM kibana_sample_data_ecommerce \n| STATS count = COUNT(*) by category ',
            },
            columns: [
              {
                columnId: 'partition_value_accessor_metric_0',
                fieldName: 'count',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'partition_value_accessor_group_by_0',
                fieldName: 'category',
                meta: {
                  type: 'string',
                },
              },
            ],
          },
        },
      },
    },
    internalReferences: [
      {
        type: 'index-pattern',
        id: 'kibana_sample_data_ecommerce-no_time_field',
        name: 'indexpattern-datasource-layer-layer_0',
      },
    ],
    visualization: {
      shape: 'mosaic',
      layers: [
        {
          metrics: ['partition_value_accessor_metric_0'],
          primaryGroups: ['partition_value_accessor_group_by_0'],
          secondaryGroups: [],
          allowMultipleMetrics: false,
          layerId: 'layer_0',
          layerType: 'data',
          numberDisplay: 'percent',
          legendDisplay: 'default',
          collapseFns: {},
          colorMapping: {
            colorMode: {
              type: 'categorical',
            },
            paletteId: 'default',
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
          },
          categoryDisplay: 'default',
        },
      ],
    },
    adHocDataViews: {
      'kibana_sample_data_ecommerce-no_time_field': {
        id: 'kibana_sample_data_ecommerce-no_time_field',
        title: 'kibana_sample_data_ecommerce',
        name: 'kibana_sample_data_ecommerce',
        sourceFilters: [],
        fieldFormats: {},
        runtimeFieldMap: {},
        fieldAttrs: {},
        allowNoIndex: false,
        allowHidden: false,
      },
    },
    query: {
      esql: 'FROM kibana_sample_data_ecommerce \n| STATS count = COUNT(*) by category ',
    },
    filters: [],
  },
  references: [],
} as LensAttributes;
export const waffleLegacyESQLState = {
  visualizationType: 'lnsPie',
  title: 'Bar vertical stacked',
  state: {
    datasourceStates: {
      textBased: {
        layers: {
          layer_0: {
            index: 'kibana_sample_data_ecommerce',
            query: {
              esql: 'FROM kibana_sample_data_ecommerce \n| STATS count = COUNT(*) by category ',
            },
            columns: [
              {
                columnId: 'partition_value_accessor_metric_0',
                fieldName: 'count',
                meta: {
                  type: 'number',
                },
              },
              {
                columnId: 'partition_value_accessor_group_by_0',
                fieldName: 'category',
                meta: {
                  type: 'string',
                },
              },
            ],
          },
        },
      },
    },
    internalReferences: [
      {
        type: 'index-pattern',
        id: 'kibana_sample_data_ecommerce-no_time_field',
        name: 'indexpattern-datasource-layer-layer_0',
      },
    ],
    visualization: {
      shape: 'waffle',
      layers: [
        {
          metrics: ['partition_value_accessor_metric_0'],
          primaryGroups: ['partition_value_accessor_group_by_0'],
          allowMultipleMetrics: false,
          layerId: 'layer_0',
          layerType: 'data',
          numberDisplay: 'percent',
          legendDisplay: 'default',
          collapseFns: {},
          colorMapping: {
            colorMode: {
              type: 'categorical',
            },
            paletteId: 'default',
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
          },
          categoryDisplay: 'default',
        },
      ],
    },
    adHocDataViews: {
      'kibana_sample_data_ecommerce-no_time_field': {
        id: 'kibana_sample_data_ecommerce-no_time_field',
        title: 'kibana_sample_data_ecommerce',
        name: 'kibana_sample_data_ecommerce',
        sourceFilters: [],
        fieldFormats: {},
        runtimeFieldMap: {},
        fieldAttrs: {},
        allowNoIndex: false,
        allowHidden: false,
      },
    },
    query: {
      esql: 'FROM kibana_sample_data_ecommerce \n| STATS count = COUNT(*) by category ',
    },
    filters: [],
  },
  references: [],
} as LensAttributes;
