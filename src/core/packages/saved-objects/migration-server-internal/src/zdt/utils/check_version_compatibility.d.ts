import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { type IndexMapping, type CompareModelVersionDetails } from '@kbn/core-saved-objects-base-server-internal';
interface CheckVersionCompatibilityOpts {
    mappings: IndexMapping;
    types: SavedObjectsType[];
    source: 'docVersions' | 'mappingVersions';
    deletedTypes: string[];
}
type CheckVersionCompatibilityStatus = 'greater' | 'lesser' | 'equal' | 'conflict';
interface CheckVersionCompatibilityResult {
    status: CheckVersionCompatibilityStatus;
    versionDetails: CompareModelVersionDetails;
    updatedRootFields: string[];
}
export declare const checkVersionCompatibility: ({ mappings, types, source, deletedTypes, }: CheckVersionCompatibilityOpts) => CheckVersionCompatibilityResult;
export {};
