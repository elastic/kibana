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

import * as ts from 'typescript';
import { ParsedUsageCollection } from './ts_parser';

export function getMappingTypeToKind(type: string) {
  switch (type) {
    case 'keyword':
    case 'text':
      return ts.SyntaxKind.StringKeyword;
    case 'boolean':
      return ts.SyntaxKind.BooleanKeyword;
    case 'number':
      return ts.SyntaxKind.NumberKeyword;
    default:
      throw new Error(`Unknown type ${type}`);
  }
}

export function isObjectMapping(value: any) {
  if (typeof value === 'object') {
    if (typeof value.type === 'string' && value.type === 'object') {
      return true;
    }

    if (typeof value.type === 'undefined') {
      return true;
    }
  }

  return false;
}

function transformToEsMapping(usageMappingValue: any) {
  const fieldMapping: any = { properties: {} };
  for (const [key, value] of Object.entries(usageMappingValue)) {
    fieldMapping.properties[key] = isObjectMapping(value) ? transformToEsMapping(value) : value;
  }
  return fieldMapping;
}

export function generateMapping(usageCollections: ParsedUsageCollection[]) {
  const esMapping: any = { properties: {} };
  for (const [, collecionDetails] of usageCollections) {
    esMapping.properties[collecionDetails.collectorName] = transformToEsMapping(
      collecionDetails.mapping.value
    );
  }

  return esMapping;
}
