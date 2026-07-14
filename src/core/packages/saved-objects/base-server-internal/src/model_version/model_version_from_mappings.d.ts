import type { IndexMapping, IndexMappingMeta } from '../mappings';
import type { VirtualVersionMap } from './version_map';
export interface GetModelVersionsFromMappingsOpts {
    mappings: IndexMapping;
    source: 'mappingVersions' | 'docVersions';
    /** if specified, will filter the types with the provided list */
    knownTypes?: string[];
    minimumVirtualVersion?: string;
}
/**
 * Build the version map from the specified source of the provided mappings.
 */
export declare const getVirtualVersionsFromMappings: ({ mappings, source, knownTypes, minimumVirtualVersion, }: GetModelVersionsFromMappingsOpts) => VirtualVersionMap | undefined;
export interface GetModelVersionsFromMappingMetaOpts {
    meta: IndexMappingMeta;
    source: 'mappingVersions' | 'docVersions';
    /** if specified, will filter the types with the provided list */
    knownTypes?: string[];
    minimumVirtualVersion?: string;
}
/**
 * Build the version map from the specified source of the provided mappings meta.
 */
export declare const getVirtualVersionsFromMappingMeta: ({ meta, source, knownTypes, minimumVirtualVersion, }: GetModelVersionsFromMappingMetaOpts) => VirtualVersionMap | undefined;
