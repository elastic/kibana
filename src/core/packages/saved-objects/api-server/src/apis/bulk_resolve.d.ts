import type { SavedObjectsResolveResponse } from './resolve';
/**
 * Object parameters for the bulk resolve operation
 *
 * @public
 */
export interface SavedObjectsBulkResolveObject {
    /** ID of the object to resiolve */
    id: string;
    /** Type of the object to resolve */
    type: string;
}
/**
 * Return type of the Saved Objects `bulkResolve()` method.
 *
 * @public
 */
export interface SavedObjectsBulkResolveResponse<T = unknown> {
    /** array of {@link SavedObjectsResolveResponse} */
    resolved_objects: Array<SavedObjectsResolveResponse<T>>;
}
