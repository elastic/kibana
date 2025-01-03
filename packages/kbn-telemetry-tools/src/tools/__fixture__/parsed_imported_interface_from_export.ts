/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SyntaxKind } from 'typescript';
import { ParsedUsageCollection } from '../ts_parser';

export const parsedImportedInterfaceFromExport: ParsedUsageCollection[] = [
  [
    'packages/kbn-telemetry-tools/src/tools/__fixture__/telemetry_collectors/imported_interface_from_export/index.ts',
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
