import type { SavedObjectMigrationFn } from '@kbn/core/server';
/**
 * Drop the previous document's attributes, which report `averageDuration` incorrectly.
 * @param doc
 */
export declare const migrate712: SavedObjectMigrationFn;
