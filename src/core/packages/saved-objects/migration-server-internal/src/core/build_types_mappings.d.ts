import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
/**
 * Merge mappings from all registered saved object types.
 */
export declare const buildTypesMappings: (types: SavedObjectsType[]) => SavedObjectsTypeMappingDefinitions;
