import type { SavedObjectsChangeAccessControlObject, SavedObjectsChangeAccessControlResponse, SavedObjectsChangeOwnershipOptions } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformChangeOwnershipParams {
    objects: SavedObjectsChangeAccessControlObject[];
    options: SavedObjectsChangeOwnershipOptions;
}
export declare const performChangeOwnership: ({ objects, options }: PerformChangeOwnershipParams, { registry, helpers, allowedTypes, client, serializer, extensions }: ApiExecutionContext) => Promise<SavedObjectsChangeAccessControlResponse>;
