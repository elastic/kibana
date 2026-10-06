import type { VirtualVersionMap, VirtualVersion } from './version_map';
interface GetModelVersionDeltaOpts {
    currentVersions: VirtualVersionMap;
    targetVersions: VirtualVersionMap;
    deletedTypes: string[];
}
type ModelVersionDeltaResultStatus = 'upward' | 'downward' | 'noop';
interface ModelVersionDeltaResult {
    status: ModelVersionDeltaResultStatus;
    diff: ModelVersionDeltaTypeResult[];
}
interface ModelVersionDeltaTypeResult {
    /** the name of the type */
    name: string;
    /**
     * the current version the type is at,
     * or undefined if the type is not present in the current versions
     */
    current: VirtualVersion | undefined;
    /**
     * the target version the type should go to,
     * or undefined if the type is not present in the target versions
     * */
    target: VirtualVersion | undefined;
}
/**
 * Will generate the difference to go from `currentVersions` to `targetVersions`.
 *
 * @remarks: will throw if the version maps are in conflict
 */
export declare const getModelVersionDelta: ({ currentVersions, targetVersions, deletedTypes, }: GetModelVersionDeltaOpts) => ModelVersionDeltaResult;
export {};
