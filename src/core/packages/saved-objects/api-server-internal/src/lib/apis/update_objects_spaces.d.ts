import type { SavedObjectsUpdateObjectsSpacesObject, SavedObjectsUpdateObjectsSpacesOptions, SavedObjectsUpdateObjectsSpacesResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformCreateParams<T = unknown> {
    objects: SavedObjectsUpdateObjectsSpacesObject[];
    spacesToAdd: string[];
    spacesToRemove: string[];
    options: SavedObjectsUpdateObjectsSpacesOptions;
}
export declare const performUpdateObjectsSpaces: <T>({ objects, spacesToAdd, spacesToRemove, options }: PerformCreateParams<T>, { registry, helpers, allowedTypes, client, serializer, logger, mappings, extensions, }: ApiExecutionContext) => Promise<SavedObjectsUpdateObjectsSpacesResponse>;
