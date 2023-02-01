/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SyntaxKind } from 'typescript';
import { ParsedUsageCollection } from '../ts_parser';

export const parsedSchemaDefinedWithSpreadsCollector: ParsedUsageCollection = [
  'packages/kbn-telemetry-tools/src/tools/__fixture__/telemetry_collectors/schema_defined_with_spreads_collector.ts',
  {
    collectorName: 'schema_defined_with_spreads',
    schema: {
      value: {
        flat: {
          type: 'keyword',
        },
        my_str: {
          type: 'text',
        },
        my_objects: {
          total: {
            type: 'long',
          },
          type: {
            type: 'boolean',
          },
        },
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
      },
    },
  },
];
