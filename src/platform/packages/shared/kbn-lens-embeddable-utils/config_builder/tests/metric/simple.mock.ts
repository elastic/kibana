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
 * Simple metric generated from kibana
 */
export const simpleMetricAttributes: LensAttributes = {
  title: 'Lens Metric - By Ref',
  description: '',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      layerId: '2821bd27-b805-4dea-a7d4-123c248e63b1',
      layerType: 'data',
      metricAccessor: '812a7944-731e-4967-8b84-1c8bba4ff04b',
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
          '2821bd27-b805-4dea-a7d4-123c248e63b1': {
            columns: {
              '812a7944-731e-4967-8b84-1c8bba4ff04b': {
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
            },
            columnOrder: ['812a7944-731e-4967-8b84-1c8bba4ff04b'],
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
      name: 'indexpattern-datasource-layer-2821bd27-b805-4dea-a7d4-123c248e63b1',
    },
  ],
} satisfies LensAttributes;
