import type { SavedObjectsChangeAccessControlObject, SavedObjectsChangeAccessModeOptions, SavedObjectsChangeAccessControlResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformChangeAccessModeParams {
    objects: SavedObjectsChangeAccessControlObject[];
    options: SavedObjectsChangeAccessModeOptions;
}
export declare const performChangeAccessMode: ({ objects, options }: PerformChangeAccessModeParams, { registry, helpers, allowedTypes, client, serializer, extensions }: ApiExecutionContext) => Promise<SavedObjectsChangeAccessControlResponse>;
