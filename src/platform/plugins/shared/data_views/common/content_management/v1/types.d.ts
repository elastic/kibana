import type { ContentManagementCrudTypes, SavedObjectCreateOptions, SavedObjectSearchOptions, SavedObjectUpdateOptions } from '@kbn/content-management-utils';
import type { DataViewAttributes } from '../../types';
import type { DataViewContentType } from './constants';
interface DataViewCreateOptions {
    id?: SavedObjectCreateOptions['id'];
    initialNamespaces?: SavedObjectCreateOptions['initialNamespaces'];
    overwrite?: SavedObjectCreateOptions['overwrite'];
    managed?: SavedObjectCreateOptions['managed'];
}
interface DataViewUpdateOptions {
    version?: SavedObjectUpdateOptions['version'];
    refresh?: SavedObjectUpdateOptions['refresh'];
    retryOnConflict?: SavedObjectUpdateOptions['retryOnConflict'];
}
interface DataViewSearchOptions {
    searchFields?: SavedObjectSearchOptions['searchFields'];
    fields?: SavedObjectSearchOptions['fields'];
}
export type DataViewCrudTypes = ContentManagementCrudTypes<DataViewContentType, DataViewAttributes, DataViewCreateOptions, DataViewUpdateOptions, DataViewSearchOptions>;
export {};
