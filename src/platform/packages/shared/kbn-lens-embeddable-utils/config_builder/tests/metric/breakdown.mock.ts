/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AvgIndexPatternColumn,
  CountIndexPatternColumn,
  FormulaIndexPatternColumn,
  MathIndexPatternColumn,
  MedianIndexPatternColumn,
  TermsIndexPatternColumn,
} from '@kbn/lens-common';
import type { LensAttributes } from '../../types';

/**
 * Metric with breakdown generated from kibana
 */
export const breakdownMetricAttributes: LensAttributes = {
  title: 'Metric - Breakdown',
  description: 'Metric with breakdown',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      layerId: '73144967-199a-451f-a407-e5e5e543cb9e',
      layerType: 'data',
      metricAccessor: '594aa5e9-9163-4b22-a19d-89b3546561d9',
      secondaryMetricAccessor: 'c6c134aa-e1eb-4484-a5da-f864b2ed5095',
      maxAccessor: 'f041d9d0-db1d-4648-8320-a58449159841',
      showBar: true,
      breakdownByAccessor: '7c4894f4-af46-409f-b4b1-731966ea1bb7',
      palette: {
        type: 'palette',
        name: 'status',
        params: {
          name: 'status',
          reverse: false,
          rangeType: 'percent',
          rangeMin: 0,
          rangeMax: 100,
          progression: 'fixed',
          stops: [
            {
              color: '#24c292',
              stop: 33.33,
            },
            {
              color: '#fcd883',
              stop: 66.66,
            },
            {
              color: '#f6726a',
              stop: 100,
            },
          ],
          steps: 3,
          colorStops: [],
          continuity: 'all',
          maxSteps: 5,
        },
      },
      secondaryTrend: {
        type: 'none',
      },
      secondaryLabelPosition: 'before',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '73144967-199a-451f-a407-e5e5e543cb9e': {
            columns: {
              '594aa5e9-9163-4b22-a19d-89b3546561d9': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                sourceField: '___records___',
                params: {
                  // @ts-expect-error why is this type erroring?
                  emptyAsNull: true,
                },
              },
              'c6c134aa-e1eb-4484-a5da-f864b2ed5095': {
                label: 'Average of bytes',
                dataType: 'number',
                operationType: 'average',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  // @ts-expect-error why is this type erroring?
                  emptyAsNull: true,
                },
              },
              'f041d9d0-db1d-4648-8320-a58449159841': {
                label: 'Static value: 400',
                dataType: 'number',
                operationType: 'static_value',
                isBucketed: false,
                params: {
                  // @ts-expect-error why is this type erroring?
                  value: '400',
                  emptyAsNull: true,
                },
                references: [],
              },
              '7c4894f4-af46-409f-b4b1-731966ea1bb7': {
                label: 'Top 5 values of extension.keyword',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'extension.keyword',
                isBucketed: true,
                params: {
                  // @ts-expect-error why is this type erroring?
                  size: 5,
                  orderBy: {
                    type: 'column',
                    columnId: '594aa5e9-9163-4b22-a19d-89b3546561d9',
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
              '7c4894f4-af46-409f-b4b1-731966ea1bb7',
              '594aa5e9-9163-4b22-a19d-89b3546561d9',
              'c6c134aa-e1eb-4484-a5da-f864b2ed5095',
              'f041d9d0-db1d-4648-8320-a58449159841',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
      // @ts-expect-error why is this type erroring?
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
  version: 1,
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-73144967-199a-451f-a407-e5e5e543cb9e',
    },
  ],
} satisfies LensAttributes;

/**
 * Metric with formula reference columns and rank_by in the terms bucket operation
 */
export const breakdownMetricWithFormulaRefColumnsAttributes: LensAttributes = {
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-fe6cb443-ec2b-4f72-ad1e-87f3f84ad30f',
    },
  ],
  title: 'metric formula',
  visualizationType: 'lnsMetric',
  version: 1,
  state: {
    visualization: {
      layerId: 'fe6cb443-ec2b-4f72-ad1e-87f3f84ad30f',
      layerType: 'data',
      metricAccessor: '0a9cac71-9abb-426a-b779-069aa1c1a2d2',
      breakdownByAccessor: 'a1282bcf-f6ca-4170-b9ff-b547b6e4e728',
      secondaryMetricAccessor: 'ff842a36-152d-45e4-a23d-67cc333829e5',
      secondaryTrend: {
        type: 'none',
      },
      secondaryLabelPosition: 'before',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          'fe6cb443-ec2b-4f72-ad1e-87f3f84ad30f': {
            columns: {
              '0a9cac71-9abb-426a-b779-069aa1c1a2d2X0': {
                label: 'Part of median(bytes)/average(bytes)',
                dataType: 'number',
                operationType: 'median',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  emptyAsNull: false,
                },
                customLabel: true,
              } as MedianIndexPatternColumn,
              '0a9cac71-9abb-426a-b779-069aa1c1a2d2X1': {
                label: 'Part of median(bytes)/average(bytes)',
                dataType: 'number',
                operationType: 'average',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  emptyAsNull: false,
                },
                customLabel: true,
              } as AvgIndexPatternColumn,
              // @ts-expect-error
              '0a9cac71-9abb-426a-b779-069aa1c1a2d2X2': {
                label: 'Part of median(bytes)/average(bytes)',
                dataType: 'number',
                operationType: 'math',
                isBucketed: false,
                params: {
                  tinymathAst: {
                    type: 'function',
                    name: 'divide',
                    args: [
                      '0a9cac71-9abb-426a-b779-069aa1c1a2d2X0',
                      '0a9cac71-9abb-426a-b779-069aa1c1a2d2X1',
                    ],
                    location: {
                      min: 0,
                      max: 28,
                    },
                    text: 'median(bytes)/average(bytes)',
                  },
                },
                references: [
                  '0a9cac71-9abb-426a-b779-069aa1c1a2d2X0',
                  '0a9cac71-9abb-426a-b779-069aa1c1a2d2X1',
                ],
                customLabel: true,
              } as MathIndexPatternColumn,
              '0a9cac71-9abb-426a-b779-069aa1c1a2d2': {
                label: 'median(bytes)/average(bytes)',
                dataType: 'number',
                operationType: 'formula',
                isBucketed: false,
                params: {
                  formula: 'median(bytes)/average(bytes)',
                  isFormulaBroken: false,
                },
                references: ['0a9cac71-9abb-426a-b779-069aa1c1a2d2X2'],
              } as FormulaIndexPatternColumn,
              'a1282bcf-f6ca-4170-b9ff-b547b6e4e728': {
                label: 'Top 5 values of geo.dest',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.dest',
                isBucketed: true,
                params: {
                  size: 5,
                  orderBy: {
                    type: 'column',
                    columnId: 'ff842a36-152d-45e4-a23d-67cc333829e5',
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
              } as TermsIndexPatternColumn,
              'ff842a36-152d-45e4-a23d-67cc333829e5': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                sourceField: '___records___',
                params: {
                  emptyAsNull: true,
                },
              } as CountIndexPatternColumn,
            },
            columnOrder: [
              'a1282bcf-f6ca-4170-b9ff-b547b6e4e728',
              '0a9cac71-9abb-426a-b779-069aa1c1a2d2',
              '0a9cac71-9abb-426a-b779-069aa1c1a2d2X0',
              '0a9cac71-9abb-426a-b779-069aa1c1a2d2X1',
              '0a9cac71-9abb-426a-b779-069aa1c1a2d2X2',
              'ff842a36-152d-45e4-a23d-67cc333829e5',
            ],
            incompleteColumns: {},
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
};
