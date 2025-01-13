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

export const parsedEnumCollector: ParsedUsageCollection = [
  'packages/kbn-telemetry-tools/src/tools/__fixture__/telemetry_collectors/enum_collector.ts',
  {
    collectorName: 'my_enum_collector',
    fetch: {
      typeName: 'Usage',
      typeDescriptor: {
        layerTypes: {
          es_docs: {
            min: {
              kind: SyntaxKind.NumberKeyword,
              type: 'NumberKeyword',
            },
            max: {
              kind: SyntaxKind.NumberKeyword,
              type: 'NumberKeyword',
            },
            total: {
              kind: SyntaxKind.NumberKeyword,
              type: 'NumberKeyword',
            },
            avg: {
              kind: SyntaxKind.NumberKeyword,
              type: 'NumberKeyword',
            },
          },
          es_top_hits: {
            min: {
              kind: SyntaxKind.NumberKeyword,
              type: 'NumberKeyword',
            },
            max: {
              kind: SyntaxKind.NumberKeyword,
              type: 'NumberKeyword',
            },
            total: {
              kind: SyntaxKind.NumberKeyword,
              type: 'NumberKeyword',
            },
            avg: {
              kind: SyntaxKind.NumberKeyword,
              type: 'NumberKeyword',
            },
          },
        },
      },
    },
    schema: {
      value: {
        layerTypes: {
          es_top_hits: {
            min: {
              type: 'long',
              _meta: {
                description: 'min number of es top hits layers per map',
              },
            },
            max: {
              type: 'long',
              _meta: {
                description: 'max number of es top hits layers per map',
              },
            },
            avg: {
              type: 'float',
              _meta: {
                description: 'avg number of es top hits layers per map',
              },
            },
            total: {
              type: 'long',
              _meta: {
                description: 'total number of es top hits layers in cluster',
              },
            },
          },
          es_docs: {
            min: {
              type: 'long',
              _meta: {
                description: 'min number of es document layers per map',
              },
            },
            max: {
              type: 'long',
              _meta: {
                description: 'max number of es document layers per map',
              },
            },
            avg: {
              type: 'float',
              _meta: {
                description: 'avg number of es document layers per map',
              },
            },
            total: {
              type: 'long',
              _meta: {
                description: 'total number of es document layers in cluster',
              },
            },
          },
        },
      },
    },
  },
];
