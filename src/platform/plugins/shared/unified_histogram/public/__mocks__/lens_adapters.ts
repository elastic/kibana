/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UnifiedHistogramChartLoadEvent } from '../types';

export const lensAdaptersMock = {
  tables: {
    tables: {
      default: {
        columns: [
          {
            id: 'col-0-1',
            meta: {
              dimensionName: 'Slice size',
              type: 'number',
            },
            name: 'Field 1',
          },
          {
            id: 'col-0-2',
            meta: {
              dimensionName: 'Slice',
              type: 'number',
            },
            name: 'Field 2',
          },
        ],
        rows: [
          {
            'col-0-1': 0,
            'col-0-2': 0,
            'col-0-3': 0,
            'col-0-4': 0,
          },
        ],
        type: 'datatable',
      },
    },
  },
} as unknown as UnifiedHistogramChartLoadEvent['adapters'];
