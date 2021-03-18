/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SyntaxKind } from 'typescript';
import { ParsedUsageCollection } from '../ts_parser';

export const parsedImportedInterfaceFromExport: ParsedUsageCollection[] = [
  [
    'src/fixtures/telemetry_collectors/imported_interface_from_export/index.ts',
    {
      collectorName: 'importing_from_export_collector',
      schema: {
        value: {
          some_field: {
            type: 'keyword',
          },
        },
      },
      fetch: {
        typeName: 'Usage',
        typeDescriptor: {
          some_field: {
            kind: SyntaxKind.StringKeyword,
            type: 'StringKeyword',
          },
        },
      },
    },
  ],
];
