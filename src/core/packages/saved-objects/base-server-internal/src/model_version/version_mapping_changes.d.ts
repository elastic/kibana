import type { SavedObjectsMappingProperties, SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
/**
 * Return the mappings that were introduced in the given version.
 * If multiple 'mappings_addition' changes are present for the version,
 * they will be deep-merged.
 */
export declare const getVersionAddedMappings: (version: SavedObjectsModelVersion) => SavedObjectsMappingProperties;
/**
 * Return the list of fields, sorted, that were introduced in the given version.
 */
export declare const getVersionAddedFields: (version: SavedObjectsModelVersion) => string[];
