/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensAttributes } from '../../types';

export const dynamicColorsMetricAttributes: LensAttributes = {
  description: 'Metric - dynamic colors',
  state: {
    visualization: {
      layerId: 'e016676a-c659-4af1-bd71-52a1e5fb37f7',
      layerType: 'data',
      metricAccessor: 'd8ef3452-490c-45e3-9505-e44b562b9f1d',
      breakdownByAccessor: 'd3c6a135-31a8-4dc0-b7a2-027ac433333c',
      palette: {
        name: 'custom',
        type: 'palette',
        params: {
          steps: 3,
          name: 'custom',
          reverse: false,
          rangeType: 'number',
          rangeMin: null,
          rangeMax: null,
          progression: 'fixed',
          stops: [
            {
              color: '#24c292',
              stop: 414.66,
            },
            {
              color: '#fcd883',
              stop: 537.31,
            },
            {
              color: '#f6726a',
              stop: 660,
            },
          ],
          colorStops: [
            {
              color: '#24c292',
              stop: null,
            },
            {
              color: '#fcd883',
              stop: 414.66,
            },
            {
              color: '#f6726a',
              stop: 537.31,
            },
          ],
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
          'e016676a-c659-4af1-bd71-52a1e5fb37f7': {
            columns: {
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
            },
            columnOrder: [
              'd3c6a135-31a8-4dc0-b7a2-027ac433333c',
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
  title: 'Metric - dynamic colors',
  version: 2,
  visualizationType: 'lnsMetric',
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-e016676a-c659-4af1-bd71-52a1e5fb37f7',
    },
  ],
} satisfies LensAttributes;
