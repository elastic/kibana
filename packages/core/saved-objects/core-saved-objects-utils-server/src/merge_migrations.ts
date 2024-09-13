/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ary, isFunction, mergeWith } from 'lodash';
import type {
  SavedObjectMigrationContext,
  SavedObjectMigration,
  SavedObjectMigrationMap,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';

/**
 * Composes two migrations into a single migration.
 * ```
 * mergeSavedObjectMigrations(outer, inner) -> (doc, context) => outer(inner(doc, context), context) }
 * ```
 *
 * If at least one of the migrations is not deferred, the composed migration will not be deferred.
 *
 * @public
 * @param outer Wrapping migration.
 * @param inner Wrapped migration.
 * @param rest Additional wrapped migrations to compose.
 * @returns The composed migration can be either a function or an object depending on the input migrations.
 */
export function mergeSavedObjectMigrations(
  outer: SavedObjectMigration,
  inner: SavedObjectMigration,
  ...rest: SavedObjectMigration[]
): SavedObjectMigration {
  if (rest.length) {
    return mergeSavedObjectMigrations(
      mergeSavedObjectMigrations(outer, inner),
      ...(rest as [SavedObjectMigration, ...SavedObjectMigration[]])
    );
  }
  if (!inner || !outer) {
    return inner || outer;
  }

  const innerMigration = isFunction(inner) ? { transform: inner } : inner;
  const outerMigration = isFunction(outer) ? { transform: outer } : outer;
  const merged = {
    deferred: !!(innerMigration.deferred && outerMigration.deferred),
    transform: (state: SavedObjectUnsanitizedDoc, context: SavedObjectMigrationContext) =>
      outerMigration.transform(innerMigration.transform(state, context), context),
  };

  if (isFunction(inner) && isFunction(outer)) {
    return merged.transform;
  }

  return merged as SavedObjectMigration;
}

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
export function mergeSavedObjectMigrationMaps(
  map1: SavedObjectMigrationMap,
  map2: SavedObjectMigrationMap
): SavedObjectMigrationMap {
  return mergeWith({ ...map1 }, map2, ary(mergeSavedObjectMigrations, 2));
}
