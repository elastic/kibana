import type { SavedObjectMigration, SavedObjectsType, SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';
import { type Transform, type TransformFn, TransformType } from './types';
/**
 * If a specific transform function fails, this tacks on a bit of information
 * about the document and transform that caused the failure.
 */
export declare function convertMigrationFunction(version: string, type: SavedObjectsType, migration: SavedObjectMigration, log: Logger): TransformFn;
/**
 * Transforms are sorted in ascending order by version depending on their type:
 *  - `core` transforms always run first no matter version;
 *  - `reference` transforms have priority in case of the same version;
 *  - `convert` transforms run after in case of the same version;
 *  - 'migrate' transforms always run last.
 * This is because:
 *  1. 'convert' transforms get rid of the `namespace` field, which must be present for 'reference' transforms to function correctly.
 *  2. 'migrate' transforms are defined by the consumer, and may change the object type or `migrationVersion` which resets the migration loop
 *     and could cause any remaining transforms for this version to be skipped.One version may contain multiple transforms.
 */
export declare function transformComparator(a: Transform, b: Transform): number;
/**
 * Returns true if the given document has an higher version that the last known version, false otherwise
 */
export declare function downgradeRequired(doc: SavedObjectUnsanitizedDoc, latestVersions: Record<TransformType, string>, targetTypeVersion?: string): boolean;
