/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SyntaxKind } from 'typescript';
import { ParsedUsageCollection } from '../ts_parser';

export const parsedSchemaDefinedWithSpreadsCollector: ParsedUsageCollection = [
  'src/fixtures/telemetry_collectors/schema_defined_with_spreads_collector.ts',
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
