import type { SavedObjectMigrationFn } from '@kbn/core/server';
/**
 * This migration script is related to:
 *   @link https://github.com/elastic/kibana/pull/62194
 *   @link https://github.com/elastic/kibana/pull/14644
 * This is only a problem when you import an object from 5.x into 6.x but to be sure that all saved objects migrated we should execute it twice in 6.7.2 and 7.9.3
 */
export declare const migrateMatchAllQuery: SavedObjectMigrationFn<any, any>;
