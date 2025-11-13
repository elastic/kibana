/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensAttributes } from '../../types';

/**
 * Complex metric generated from kibana
 */
export const complexMetricAttributes: LensAttributes = {
  title: 'Metric - Complex',
  description: 'Complex Lens Metric',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      layerId: '73144967-199a-451f-a407-e5e5e543cb9e',
      layerType: 'data',
      metricAccessor: '594aa5e9-9163-4b22-a19d-89b3546561d9',
      secondaryMetricAccessor: 'c6c134aa-e1eb-4484-a5da-f864b2ed5095',
      maxAccessor: 'f041d9d0-db1d-4648-8320-a58449159841',
      color: '#FFf',
      showBar: true,
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
                label: 'Maximum of bytes',
                dataType: 'number',
                operationType: 'max',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  // @ts-expect-error why is this type erroring?
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
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
