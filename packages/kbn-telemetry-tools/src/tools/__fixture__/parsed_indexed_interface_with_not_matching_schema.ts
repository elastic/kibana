/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SyntaxKind } from 'typescript';
import { ParsedUsageCollection } from '../ts_parser';

export const parsedIndexedInterfaceWithNoMatchingSchema: ParsedUsageCollection = [
  'src/fixtures/telemetry_collectors/indexed_interface_with_not_matching_schema.ts',
  {
    collectorName: 'indexed_interface_with_not_matching_schema',
    schema: {
      value: {
        something: {
          count_1: {
            type: 'long',
          },
        },
      },
    },
    fetch: {
      typeName: 'Usage',
      typeDescriptor: {
        '@@INDEX@@': {
          count_1: {
            kind: SyntaxKind.NumberKeyword,
            type: 'NumberKeyword',
          },
          count_2: {
            kind: SyntaxKind.NumberKeyword,
            type: 'NumberKeyword',
          },
        },
      },
    },
  },
];
