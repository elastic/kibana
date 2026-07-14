import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
export interface CreateIndexMapOptions {
    kibanaIndexName: string;
    registry: ISavedObjectTypeRegistry;
    indexMap: SavedObjectsTypeMappingDefinitions;
}
export interface IndexMap {
    [index: string]: {
        typeMappings: SavedObjectsTypeMappingDefinitions;
        script?: string;
    };
}
export declare function createIndexMap({ kibanaIndexName, registry, indexMap }: CreateIndexMapOptions): IndexMap;
