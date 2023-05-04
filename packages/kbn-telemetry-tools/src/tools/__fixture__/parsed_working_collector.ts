/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SyntaxKind } from 'typescript';
import { ParsedUsageCollection } from '../ts_parser';

export const parsedWorkingCollector: ParsedUsageCollection = [
  'packages/kbn-telemetry-tools/src/tools/__fixture__/telemetry_collectors/working_collector.ts',
  {
    collectorName: 'my_working_collector',
    schema: {
      value: {
        interface_terms: {
          computed_term: {
            total: { type: 'long' },
            type: { type: 'boolean' },
          },
        },
        flat: {
          type: 'keyword',
        },
        my_str: {
          type: 'text',
        },
        my_index_signature_prop: {
          avg: {
            type: 'float',
          },
          count: {
            type: 'long',
          },
          max: {
            type: 'long',
          },
          min: {
            type: 'long',
          },
        },
        my_objects: {
          total: {
            type: 'long',
          },
          type: {
            type: 'boolean',
          },
        },
        my_array: {
          type: 'array',
          items: {
            total: {
              type: 'long',
            },
            type: { type: 'boolean' },
          },
        },
        my_str_array: { type: 'array', items: { type: 'keyword' } },
      },
    },
    fetch: {
      typeName: 'Usage',
      typeDescriptor: {
        flat: {
          kind: SyntaxKind.StringKeyword,
          type: 'StringKeyword',
        },
        my_str: {
          kind: SyntaxKind.StringKeyword,
          type: 'StringKeyword',
        },
        my_index_signature_prop: {
          '@@INDEX@@': {
            kind: SyntaxKind.NumberKeyword,
            type: 'NumberKeyword',
          },
        },
        my_objects: {
          total: {
            kind: SyntaxKind.NumberKeyword,
            type: 'NumberKeyword',
          },
          type: {
            kind: SyntaxKind.BooleanKeyword,
            type: 'BooleanKeyword',
          },
        },
        my_array: {
          items: {
            total: {
              kind: SyntaxKind.NumberKeyword,
              type: 'NumberKeyword',
            },
            type: {
              kind: SyntaxKind.BooleanKeyword,
              type: 'BooleanKeyword',
            },
          },
        },
        my_str_array: {
          items: {
            kind: SyntaxKind.StringKeyword,
            type: 'StringKeyword',
          },
        },
        interface_terms: {
          computed_term: {
            total: {
              kind: SyntaxKind.NumberKeyword,
              type: 'NumberKeyword',
            },
            type: {
              kind: SyntaxKind.BooleanKeyword,
              type: 'BooleanKeyword',
            },
          },
        },
      },
    },
  },
];
