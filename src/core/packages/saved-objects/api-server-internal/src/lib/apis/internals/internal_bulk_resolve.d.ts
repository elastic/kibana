import { type SavedObjectsBulkResolveObject, type SavedObjectsResolveOptions, type SavedObjectsResolveResponse, type SavedObjectsIncrementCounterField, type SavedObjectsIncrementCounterOptions } from '@kbn/core-saved-objects-api-server';
import { type SavedObject, type BulkResolveError } from '@kbn/core-saved-objects-server';
import type { ApiExecutionContext } from '../types';
/**
 * Parameters for the internal bulkResolve function.
 *
 * @internal
 */
export interface InternalBulkResolveParams {
    objects: SavedObjectsBulkResolveObject[];
    options?: SavedObjectsResolveOptions;
    incrementCounterInternal: <T = unknown>(type: string, id: string, counterFields: Array<string | SavedObjectsIncrementCounterField>, options?: SavedObjectsIncrementCounterOptions<T>) => Promise<SavedObject<T>>;
}
/**
 * The response when objects are resolved.
 *
 * @public
 */
export interface InternalSavedObjectsBulkResolveResponse<T = unknown> {
    resolved_objects: Array<SavedObjectsResolveResponse<T> | BulkResolveError>;
}
export declare function internalBulkResolve<T>(params: InternalBulkResolveParams, apiExecutionContext: ApiExecutionContext): Promise<InternalSavedObjectsBulkResolveResponse<T>>;
