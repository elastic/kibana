/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';
import { unflattenObject } from '@kbn/object-utils';
import type { MigrationSnapshot } from '../types';

const isFlattenedMapping = (mappings: Record<string, unknown>): boolean =>
  Object.keys(mappings).some((key) => key.includes('.'));

const normalizeRootMappingProperties = (
  mappings: SavedObjectsTypeMappingDefinition
): SavedObjectsTypeMappingDefinition => {
  if (!Object.hasOwn(mappings, 'properties')) {
    return { ...mappings, properties: {} };
  }
  return mappings;
};

export const unflattenSnapshotMappings = (
  mappings: Record<string, unknown>
): SavedObjectsTypeMappingDefinition => {
  const nestedMappings = isFlattenedMapping(mappings)
    ? (unflattenObject(mappings) as unknown as SavedObjectsTypeMappingDefinition)
    : (mappings as unknown as SavedObjectsTypeMappingDefinition);

  return normalizeRootMappingProperties(nestedMappings);
};

export const extractMappingsFromSnapshot = (
  snapshot: MigrationSnapshot
): Record<string, SavedObjectsTypeMappingDefinition> =>
  Object.entries(snapshot.typeDefinitions).reduce<
    Record<string, SavedObjectsTypeMappingDefinition>
  >((mappings, [typeName, typeDefinition]) => {
    mappings[typeName] = unflattenSnapshotMappings(typeDefinition.mappings);
    return mappings;
  }, {});
