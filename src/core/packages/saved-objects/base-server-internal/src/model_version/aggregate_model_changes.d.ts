import type { SavedObjectsModelChange, SavedObjectsMappingProperties } from '@kbn/core-saved-objects-server';
/**
 * Merge the added mappings from the given list of model changes.
 * Note: only changes of the `mappings_addition` type have mapping addition.
 */
export declare const aggregateMappingAdditions: (changes: SavedObjectsModelChange[]) => SavedObjectsMappingProperties;
