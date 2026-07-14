import type { SavedObject } from '../..';
/**
 * Base options used by most of the savedObject APIs.
 * @public
 */
export interface SavedObjectsBaseOptions {
    /** Specify the namespace for this operation */
    namespace?: string;
}
/**
 * Elasticsearch Refresh setting for mutating operation
 * @public
 */
export type MutatingOperationRefreshSetting = boolean | 'wait_for';
/**
 * Base return for saved object bulk operations
 *
 * @public
 */
export interface SavedObjectsBulkResponse<T = unknown> {
    /** array of saved objects */
    saved_objects: Array<SavedObject<T>>;
}
