import type { DeprecationsDetails } from '@kbn/core-deprecations-common';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { type ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
interface UnknownTypesDeprecationOptions {
    typeRegistry: ISavedObjectTypeRegistry;
    esClient: IScopedClusterClient;
    kibanaVersion: string;
}
export declare const getUnknownTypesDeprecations: (options: UnknownTypesDeprecationOptions) => Promise<DeprecationsDetails[]>;
interface DeleteUnknownTypesOptions {
    typeRegistry: ISavedObjectTypeRegistry;
    esClient: IScopedClusterClient;
    kibanaVersion: string;
}
export declare const deleteUnknownTypeObjects: ({ esClient, typeRegistry, kibanaVersion, }: DeleteUnknownTypesOptions) => Promise<void>;
export {};
