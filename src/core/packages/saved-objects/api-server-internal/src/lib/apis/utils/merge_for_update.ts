/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { MappingProperty as EsMappingProperty } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  SavedObjectsTypeMappingDefinition,
  SavedObjectsFieldMapping,
} from '@kbn/core-saved-objects-server';

type MaybeMappings = SavedObjectsFieldMapping | EsMappingProperty | undefined;

export const mergeForUpdate = ({
  targetAttributes,
  updatedAttributes,
  typeMappings,
}: {
  targetAttributes: Record<string, any>;
  updatedAttributes: any;
  typeMappings: SavedObjectsTypeMappingDefinition;
}): Record<string, any> => {
  const rootMappings: SavedObjectsFieldMapping = {
    properties: typeMappings.properties,
  };
  return recursiveMerge(targetAttributes, updatedAttributes, [], rootMappings);
};

const recursiveMerge = (
  target: Record<string, any>,
  value: any,
  keys: string[],
  mappings: MaybeMappings
) => {
  if (shouldRecursiveMerge(value, mappings)) {
    for (const [subKey, subVal] of Object.entries(value)) {
      recursiveMerge(target, subVal, [...keys, subKey], getFieldMapping(mappings, subKey));
    }
  } else if (keys.length > 0 && value !== undefined) {
    set(target, keys, value);
  }

  return target;
};

const getFieldMapping = (parentMapping: MaybeMappings, fieldName: string): MaybeMappings => {
  if (parentMapping && 'properties' in parentMapping) {
    return parentMapping.properties?.[fieldName];
  }
  return undefined;
};

const shouldRecursiveMerge = (value: any, mappings: MaybeMappings): boolean => {
  if (mappings && 'type' in mappings && mappings.type === 'flattened') {
    return false;
  }
  if (isPlainObject(value) && Object.keys(value).length > 0) {
    return true;
  }
  return false;
};
