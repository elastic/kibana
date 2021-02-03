/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SyntaxKind } from 'typescript';
import { ParsedUsageCollection } from '../ts_parser';

export const parsedExternallyDefinedCollector: ParsedUsageCollection[] = [
  [
    'src/fixtures/telemetry_collectors/externally_defined_collector.ts',
    {
      collectorName: 'from_variable_collector',
      schema: {
        value: {
          locale: {
            type: 'keyword',
          },
        },
      },
      fetch: {
        typeName: 'Usage',
        typeDescriptor: {
          locale: {
            kind: SyntaxKind.StringKeyword,
            type: 'StringKeyword',
          },
        },
      },
    },
  ],
  [
    'src/fixtures/telemetry_collectors/externally_defined_collector.ts',
    {
      collectorName: 'from_fn_collector',
      schema: {
        value: {
          locale: {
            type: 'keyword',
          },
        },
      },
      fetch: {
        typeName: 'Usage',
        typeDescriptor: {
          locale: {
            kind: SyntaxKind.StringKeyword,
            type: 'StringKeyword',
          },
        },
      },
    },
  ],
];
