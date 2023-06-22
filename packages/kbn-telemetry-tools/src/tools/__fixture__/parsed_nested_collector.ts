/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SyntaxKind } from 'typescript';
import { ParsedUsageCollection } from '../ts_parser';

export const parsedNestedCollector: ParsedUsageCollection = [
  'packages/kbn-telemetry-tools/src/tools/__fixture__/telemetry_collectors/nested_collector.ts',
  {
    collectorName: 'my_nested_collector',
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
];
