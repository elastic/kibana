import type { IndexMappingMeta, VirtualVersionMap, IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
/**
 * Compare the current mappings for root fields Vs those stored in the SO index.
 * Relies on getBaseMappings to determine the current mappings.
 * @param indexMappings The mappings stored in the SO index
 * @returns A list of the root fields whose mappings have changed
 */
export declare const getUpdatedRootFields: (indexMappings: IndexMapping) => string[];
interface GetUpdatedTypesParams {
    indexMeta?: IndexMappingMeta;
    indexTypes: string[];
    latestMappingsVersions: VirtualVersionMap;
    hashToVersionMap?: Record<string, string>;
}
/**
 * Compares the current vs stored mappings' hashes or modelVersions.
 * Returns 2 lists: one with all the new types and one with the types that have been updated.
 * @param indexMeta The meta information stored in the SO index
 * @param knownTypes The list of SO types that belong to the index and are enabled
 * @param latestMappingsVersions A map holding [type => version] with the latest versions where mappings have changed for each type
 * @param hashToVersionMap A map holding information about [md5 => modelVersion] equivalence
 * @returns the lists of new types and updated types
 */
export declare const getNewAndUpdatedTypes: ({ indexMeta, indexTypes, latestMappingsVersions, hashToVersionMap, }: GetUpdatedTypesParams) => {
    newTypes: string[];
    updatedTypes: string[];
};
export {};
