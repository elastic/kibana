import type { SavedObjectsBaseOptions } from './base';
/**
 *
 * @public
 */
export interface SavedObjectsDeleteByNamespaceOptions extends SavedObjectsBaseOptions {
    /** The Elasticsearch supports only boolean flag for this operation */
    refresh?: boolean;
}
