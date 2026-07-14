import type { MutatingOperationRefreshSetting, SavedObjectsBaseOptions } from './base';
/**
 *
 * @public
 */
export interface SavedObjectsDeleteOptions extends SavedObjectsBaseOptions {
    /** The Elasticsearch Refresh setting for this operation */
    refresh?: MutatingOperationRefreshSetting;
    /** Force deletion of an object that exists in multiple namespaces */
    force?: boolean;
}
