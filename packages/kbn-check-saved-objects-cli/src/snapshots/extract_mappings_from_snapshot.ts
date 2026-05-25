/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
import type { MigrationSnapshot } from '../types';

export const extractMappingsFromSnapshot = (
  snapshot: MigrationSnapshot
): SavedObjectsTypeMappingDefinitions =>
  Object.entries(snapshot.typeDefinitions).reduce<SavedObjectsTypeMappingDefinitions>(
    (mappings, [typeName, typeDefinition]) => {
      mappings[typeName] = typeDefinition.mappings as unknown as SavedObjectsTypeMappingDefinitions[string];
      return mappings;
    },
    {}
  );
