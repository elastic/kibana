/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SyntaxKind } from 'typescript';
import { ParsedUsageCollection } from '../ts_parser';

export const parsedImportedSchemaCollector: ParsedUsageCollection[] = [
  [
    'src/fixtures/telemetry_collectors/imported_schema.ts',
    {
      collectorName: 'with_imported_schema',
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
