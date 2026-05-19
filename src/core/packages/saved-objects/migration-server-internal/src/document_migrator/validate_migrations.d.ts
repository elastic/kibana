import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
/**
 * Validates the consistency of the given type for use with the document migrator.
 */
export declare function validateTypeMigrations({ type, kibanaVersion, convertVersion, }: {
    type: SavedObjectsType;
    kibanaVersion: string;
    convertVersion?: string;
}): void;
