import { type SavedObjectsBulkGetObject, type SavedObjectsBulkResponse, type SavedObjectsGetOptions } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformBulkGetParams<T = unknown> {
    objects: SavedObjectsBulkGetObject[];
    options: SavedObjectsGetOptions;
}
export declare const performBulkGet: <T>({ objects, options }: PerformBulkGetParams<T>, { helpers, allowedTypes, client, serializer, registry, extensions }: ApiExecutionContext) => Promise<SavedObjectsBulkResponse<T>>;
