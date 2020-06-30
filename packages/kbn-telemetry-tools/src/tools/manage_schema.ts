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

import { ParsedUsageCollection } from './ts_parser';

export type AllowedSchemaTypes =
  | 'keyword'
  | 'text'
  | 'number'
  | 'boolean'
  | 'long'
  | 'date'
  | 'float';

export function compatibleSchemaTypes(type: AllowedSchemaTypes) {
  switch (type) {
    case 'keyword':
    case 'text':
    case 'date':
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'number':
    case 'float':
    case 'long':
      return 'number';
    default:
      throw new Error(`Unknown schema type ${type}`);
  }
}

export function isObjectMapping(entity: any) {
  if (typeof entity === 'object') {
    // 'type' is explicitly specified to be an object.
    if (typeof entity.type === 'string' && entity.type === 'object') {
      return true;
    }

    // 'type' is not set; ES defaults to object mapping for when type is unspecified.
    if (typeof entity.type === 'undefined') {
      return true;
    }

    // 'type' is a field in the mapping and is not the type of the mapping.
    if (typeof entity.type === 'object') {
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
      collecionDetails.schema.value
    );
  }

  return esMapping;
}
