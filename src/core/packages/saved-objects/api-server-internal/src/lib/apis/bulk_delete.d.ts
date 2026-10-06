import { type SavedObjectsBulkDeleteObject, type SavedObjectsBulkDeleteOptions, type SavedObjectsBulkDeleteResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformBulkDeleteParams<T = unknown> {
    objects: SavedObjectsBulkDeleteObject[];
    options: SavedObjectsBulkDeleteOptions;
}
export declare const performBulkDelete: <T>({ objects, options }: PerformBulkDeleteParams<T>, { registry, helpers, allowedTypes, client, serializer, extensions, logger, mappings, }: ApiExecutionContext) => Promise<SavedObjectsBulkDeleteResponse>;
