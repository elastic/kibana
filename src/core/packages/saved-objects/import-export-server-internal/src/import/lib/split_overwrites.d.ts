import type { SavedObjectsImportRetry } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';
export declare function splitOverwrites<T>(savedObjects: Array<SavedObject<T>>, retries: SavedObjectsImportRetry[]): {
    objectsToOverwrite: SavedObject<T>[];
    objectsToNotOverwrite: SavedObject<T>[];
};
