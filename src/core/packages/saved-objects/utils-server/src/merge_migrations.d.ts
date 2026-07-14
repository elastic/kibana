import type { SavedObjectMigration, SavedObjectMigrationMap } from '@kbn/core-saved-objects-server';
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
export declare function mergeSavedObjectMigrations(outer: SavedObjectMigration, inner: SavedObjectMigration, ...rest: SavedObjectMigration[]): SavedObjectMigration;
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
export declare function mergeSavedObjectMigrationMaps(map1: SavedObjectMigrationMap, map2: SavedObjectMigrationMap): SavedObjectMigrationMap;
