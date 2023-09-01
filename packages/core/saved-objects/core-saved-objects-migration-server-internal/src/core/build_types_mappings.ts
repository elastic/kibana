/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';

/**
 * Merge mappings from all registered saved object types.
 */
export const buildTypesMappings = (
  types: SavedObjectsType[]
): SavedObjectsTypeMappingDefinitions => {
  return types.reduce<SavedObjectsTypeMappingDefinitions>((acc, { name: type, mappings }) => {
    const duplicate = acc.hasOwnProperty(type);
    if (duplicate) {
      throw new Error(`Type ${type} is already defined.`);
    }
    acc[type] = mappings;
    return acc;
  }, {});
};
