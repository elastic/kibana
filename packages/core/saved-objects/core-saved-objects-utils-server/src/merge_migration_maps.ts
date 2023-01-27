/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isFunction, mergeWith } from 'lodash';
import type {
  SavedObjectMigrationContext,
  SavedObjectMigration,
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';

/**
 * Merges two saved object migration maps.
 *
 * If there is a migration for a given version on only one of the maps,
 * that migration function will be used:
 *
 * mergeSavedObjectMigrationMaps({ '1.2.3': f }, { '4.5.6': g }) -> { '1.2.3': f, '4.5.6': g }
 *
 * If there is a migration for a given version on both maps, the migrations will be composed:
 *
 * mergeSavedObjectMigrationMaps({ '1.2.3': f }, { '1.2.3': g }) -> { '1.2.3': (doc, context) => f(g(doc, context), context) }
 *
 * @public
 *
 * @param map1 - The first map to merge
 * @param map2 - The second map to merge
 * @returns The merged map {@link SavedObjectMigrationMap}
 */
export const mergeSavedObjectMigrationMaps = (
  map1: SavedObjectMigrationMap,
  map2: SavedObjectMigrationMap
): SavedObjectMigrationMap => {
  const customizer = (outer: SavedObjectMigration, inner: SavedObjectMigration) => {
    if (!inner || !outer) {
      return inner || outer;
    }

    const merged = mergeWith(
      { ...(isFunction(inner) ? { transform: inner } : inner) },
      isFunction(outer) ? { transform: outer } : outer,
      (innerValue, outerValue, key) => {
        if (key === 'deferred') {
          return !!(innerValue && outerValue);
        }

        if (key === 'transform') {
          return (state: SavedObjectUnsanitizedDoc, context: SavedObjectMigrationContext) =>
            outerValue(innerValue(state, context), context);
        }

        return inner ?? outer;
      }
    );

    if (isFunction(inner) && isFunction(outer)) {
      return merged.transform;
    }

    return merged;
  };

  return mergeWith({ ...map1 }, map2, customizer);
};
