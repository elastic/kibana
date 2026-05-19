import type { SavedObjectsMappingProperties } from '@kbn/core-saved-objects-server';
import type { IndexMapping, IndexMappingMeta, IndexMappingSafe, SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
/**
 * Creates an index mapping with the core properties required by saved object
 * indices, as well as the specified additional properties.
 *
 * @param typeDefinitions - the type definitions to build mapping from.
 */
export declare function buildActiveMappings(typeDefinitions: SavedObjectsTypeMappingDefinitions | SavedObjectsMappingProperties, _meta?: IndexMappingMeta): IndexMapping;
/**
 * Defines the mappings for the root fields, common to all saved objects.
 * These are present in all SO indices.
 *
 * @returns {IndexMapping}
 */
export declare function getBaseMappings(): IndexMappingSafe;
