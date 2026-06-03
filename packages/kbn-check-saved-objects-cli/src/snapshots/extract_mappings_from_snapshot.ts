/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
import { unflattenObject } from '@kbn/object-utils';
import { isPlainObject } from 'lodash';
import type { MigrationSnapshot } from '../types';

const isFlattenedMapping = (mappings: Record<string, unknown>): boolean =>
  Object.keys(mappings).some((key) => key.includes('.'));

const normalizeMappingProperties = (node: Record<string, unknown>): Record<string, unknown> => {
  if (!Object.hasOwn(node, 'type') && !Object.hasOwn(node, 'properties')) {
    return { ...node, properties: {} };
  }

  if (isPlainObject(node.properties)) {
    const properties = node.properties as Record<string, Record<string, unknown>>;
    return {
      ...node,
      properties: Object.fromEntries(
        Object.entries(properties).map(([field, child]) => [
          field,
          normalizeMappingProperties(child),
        ])
      ),
    };
  }

  return node;
};

export const unflattenSnapshotMappings = (
  mappings: Record<string, unknown>
): SavedObjectsTypeMappingDefinitions[string] => {
  const nestedMappings = isFlattenedMapping(mappings) ? unflattenObject(mappings) : mappings;

  return normalizeMappingProperties(
    nestedMappings
  ) as unknown as SavedObjectsTypeMappingDefinitions[string];
};

export const extractMappingsFromSnapshot = (
  snapshot: MigrationSnapshot
): SavedObjectsTypeMappingDefinitions =>
  Object.entries(snapshot.typeDefinitions).reduce<SavedObjectsTypeMappingDefinitions>(
    (mappings, [typeName, typeDefinition]) => {
      mappings[typeName] = unflattenSnapshotMappings(typeDefinition.mappings);
      return mappings;
    },
    {}
  );
