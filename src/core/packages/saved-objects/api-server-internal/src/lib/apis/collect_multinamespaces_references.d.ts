import type { SavedObjectsCollectMultiNamespaceReferencesObject, SavedObjectsCollectMultiNamespaceReferencesOptions, SavedObjectsCollectMultiNamespaceReferencesResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformCreateParams<T = unknown> {
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[];
    options: SavedObjectsCollectMultiNamespaceReferencesOptions;
}
export declare const performCollectMultiNamespaceReferences: <T>({ objects, options }: PerformCreateParams<T>, { registry, helpers, allowedTypes, client, serializer, extensions }: ApiExecutionContext) => Promise<SavedObjectsCollectMultiNamespaceReferencesResponse>;
