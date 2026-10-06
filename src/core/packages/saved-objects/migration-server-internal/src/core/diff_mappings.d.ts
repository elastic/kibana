import type { IndexMapping, VirtualVersionMap } from '@kbn/core-saved-objects-base-server-internal';
/**
 * Diffs the stored vs app mappings.
 * On one hand, it compares changes in root fields, by deep comparing the actual mappings.
 * On the other hand, it compares changes in SO types mappings:
 * Historically, this comparison was done using md5 hashes.
 * Currently, and in order to be FIPS compliant, this has been replaced by comparing model versions.
 * The `getUpdatedTypes` uses a map to handle the transition md5 => modelVersion

 * @param indexMappings The mappings stored in the SO index
 * @param appMappings The current Kibana mappings, computed from the typeRegistry
 * @param indexTypes A list of the SO types that are bound to the SO index
 * @param latestMappingsVersions A map containing the latest version in which each type has updated its mappings
 * @param hashToVersionMap Map that holds md5 => modelVersion equivalence, to smoothly transition away from hashes
 */
export declare function diffMappings({ indexMappings, appMappings, indexTypes, latestMappingsVersions, hashToVersionMap, }: {
    indexMappings: IndexMapping;
    appMappings: IndexMapping;
    indexTypes: string[];
    latestMappingsVersions: VirtualVersionMap;
    hashToVersionMap?: Record<string, string>;
}): {
    changedProp: string;
} | undefined;
