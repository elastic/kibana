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
 *  Simple legacy metric generated from kibana
 */
export const simpleLegacyMetricAttributes: LensAttributes = {
  title: 'Lens Legacy Metric',
  description: 'Median of Bytes',
  visualizationType: 'lnsLegacyMetric',
  state: {
    visualization: {
      layerId: '16c2ab17-6a5c-4b14-841c-f82b26c5d505',
      accessor: 'e6a05797-d41e-4f28-8768-98f7c8e81c6d',
      layerType: 'data',
      titlePosition: 'bottom',
      size: 'l',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '16c2ab17-6a5c-4b14-841c-f82b26c5d505': {
            columns: {
              'e6a05797-d41e-4f28-8768-98f7c8e81c6d': {
                label: 'Median of bytes',
                dataType: 'number',
                operationType: 'median',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: ['e6a05797-d41e-4f28-8768-98f7c8e81c6d'],
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
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-16c2ab17-6a5c-4b14-841c-f82b26c5d505',
    },
  ],
} satisfies LensAttributes;
