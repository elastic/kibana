import { type SavedObjectsCreateOptions, type SavedObjectsBulkCreateObject, type SavedObjectsBulkResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformBulkCreateParams<T = unknown> {
    objects: Array<SavedObjectsBulkCreateObject<T>>;
    options: SavedObjectsCreateOptions;
}
export declare const performBulkCreate: <T>({ objects, options }: PerformBulkCreateParams<T>, { registry, helpers, allowedTypes, client, serializer, migrator, extensions, }: ApiExecutionContext) => Promise<SavedObjectsBulkResponse<T>>;
