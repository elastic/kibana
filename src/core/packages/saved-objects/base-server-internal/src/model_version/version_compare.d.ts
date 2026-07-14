import type { VirtualVersionMap } from './version_map';
export interface CompareModelVersionMapParams {
    /** The latest model version of the types registered in the application */
    appVersions: VirtualVersionMap;
    /** The model version stored in the index */
    indexVersions: VirtualVersionMap;
    /** The list of deleted types to exclude during the compare process */
    deletedTypes: string[];
}
/**
 * The overall status of the model version comparison:
 * - `greater`: app version is greater than the index version
 * - `lesser`: app version is lesser than the index version
 * - `equal`: app version is equal to the index version
 * - `conflict`: app and index versions are incompatible (versions for some types are higher, and for other types lower)
 */
export type CompareModelVersionStatus = 'greater' | 'lesser' | 'equal' | 'conflict';
export interface CompareModelVersionDetails {
    greater: string[];
    lesser: string[];
    equal: string[];
}
export interface CompareModelVersionResult {
    status: CompareModelVersionStatus;
    details: CompareModelVersionDetails;
}
export declare const compareVirtualVersions: ({ appVersions, indexVersions, deletedTypes, }: CompareModelVersionMapParams) => CompareModelVersionResult;
