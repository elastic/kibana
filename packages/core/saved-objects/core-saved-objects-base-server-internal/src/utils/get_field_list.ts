/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MappingProperty as EsMappingProperty } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  SavedObjectsTypeMappingDefinition,
  SavedObjectsFieldMapping,
} from '@kbn/core-saved-objects-server';
import type { SavedObjectsTypeMappingDefinitions } from '../mappings';

export type FieldListMap = Record<string, string[]>;

export const getFieldListMapFromMappingDefinitions = (
  mappings: SavedObjectsTypeMappingDefinitions
): FieldListMap => {
  return Object.entries(mappings).reduce<FieldListMap>((memo, [typeName, typeMappings]) => {
    memo[typeName] = getFieldListFromTypeMapping(typeMappings);
    return memo;
  }, {});
};

type AnyFieldMapping = SavedObjectsFieldMapping | EsMappingProperty;

interface QueueItem {
  fieldPath: string[];
  fieldDef: AnyFieldMapping;
}

export const getFieldListFromTypeMapping = (
  typeMappings: SavedObjectsTypeMappingDefinition
): string[] => {
  const fieldList: string[] = [];
  const queue: QueueItem[] = [];

  Object.entries(typeMappings.properties).forEach(([fieldName, fieldDef]) => {
    queue.push({
      fieldPath: [fieldName],
      fieldDef,
    });
  });

  while (queue.length > 0) {
    const item = queue.pop()!;
    fieldList.push(item.fieldPath.join('.'));
    if ('properties' in item.fieldDef) {
      Object.entries(item.fieldDef.properties ?? {}).forEach(([fieldName, fieldDef]) => {
        queue.push({
          fieldPath: [...item.fieldPath, fieldName],
          fieldDef,
        });
      });
    }
  }

  return fieldList.sort();
};
