/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ParsedUsageCollection } from './ts_parser';

export type AllowedSchemaNumberTypes = 'long' | 'integer' | 'short' | 'byte' | 'double' | 'float';

export type AllowedSchemaTypes = AllowedSchemaNumberTypes | 'keyword' | 'text' | 'boolean' | 'date';

export function compatibleSchemaTypes(type: AllowedSchemaTypes | 'array') {
  switch (type) {
    case 'keyword':
    case 'text':
    case 'date':
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'long':
    case 'integer':
    case 'short':
    case 'byte':
    case 'double':
    case 'float':
      return 'number';
    case 'array':
      return 'array';
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

export function isMetaDescription(entity: any) {
  console.log('what is the entity in here?', entity);
  // TODO: Do not generate a mapping for `_meta: { description: string }` fields.
  if (typeof entity === 'object') {
    if (entity._meta && typeof entity._meta === 'object') {
      const entityKeys = Object.keys(entity._meta);
      // TODO extract this into another helper for simplicity
      if (
        entityKeys.length === 1 &&
        entityKeys.includes('description') &&
        typeof entity._meta.description === 'string'
      ) {
        return true;
      }
    }
  }
  return false;
}

function isArrayMapping(entity: any): entity is { type: 'array'; items: object } {
  return typeof entity === 'object' && entity.type === 'array' && typeof entity.items === 'object';
}

function getValueMapping(value: any) {
  if (!isMetaDescription(value)) {
    console.log('not meta');
    return isObjectMapping(value) ? transformToEsMapping(value) : value;
  }
  console.log('meta');
  return;
}

function transformToEsMapping(usageMappingValue: any) {
  const fieldMapping: any = { properties: {} };
  for (const [key, value] of Object.entries(usageMappingValue)) {
    if (isArrayMapping(value)) {
      fieldMapping.properties[key] = { ...value, items: getValueMapping(value.items) };
    } else {
      fieldMapping.properties[key] = getValueMapping(value);
    }
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
