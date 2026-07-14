import type { SavedObjectsBaseOptions } from './base';
/**
 *
 * @public
 */
export interface SavedObjectsRemoveReferencesToOptions extends SavedObjectsBaseOptions {
    /** The Elasticsearch Refresh setting for this operation. Defaults to `true` */
    refresh?: boolean;
}
/**
 *
 * @public
 */
export interface SavedObjectsRemoveReferencesToResponse extends SavedObjectsBaseOptions {
    /** The number of objects that have been updated by this operation */
    updated: number;
}
