import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObject } from '@kbn/core-saved-objects-common';
import type { SavedObjectsExportTransform } from '@kbn/core-saved-objects-server';
import { type SavedObjectComparator } from './utils';
interface ApplyExportTransformsOptions {
    objects: SavedObject[];
    request: KibanaRequest;
    transforms: Map<string, SavedObjectsExportTransform>;
    sortFunction?: SavedObjectComparator;
}
export declare const applyExportTransforms: ({ objects, request, transforms, sortFunction, }: ApplyExportTransformsOptions) => Promise<SavedObject[]>;
export {};
