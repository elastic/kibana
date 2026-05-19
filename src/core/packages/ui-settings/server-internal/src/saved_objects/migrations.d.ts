import type { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc, SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
/**
 * @note Since all `uiSettings` migrations are added to the same migration function,
 * while not required, grouping settings by team, using a consistent naming prefix,
 * is good practice. For example: `ml:<setting-name>`.
 */
export declare const modelVersions: SavedObjectsModelVersionMap;
/**
 * Migrations using legacy upgrade mechanism, do not add to or remove from this map.
 * Future migrations should live in modelVersions map.
 */
export declare const migrations: {
    '7.9.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '7.12.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '7.13.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '8.0.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '8.1.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '8.5.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '8.7.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
    '8.9.0': (doc: SavedObjectUnsanitizedDoc<any>) => SavedObjectSanitizedDoc<any>;
};
