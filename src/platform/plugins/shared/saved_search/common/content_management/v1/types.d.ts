import type { ContentManagementCrudTypes, SavedObjectCreateOptions, SavedObjectSearchOptions, SavedObjectUpdateOptions } from '@kbn/content-management-utils';
import type { SavedSearchContentType } from '../../constants';
import type { DiscoverSessionAttributes } from '../../../server';
interface SavedSearchCreateOptions {
    id?: SavedObjectCreateOptions['id'];
    overwrite?: SavedObjectCreateOptions['overwrite'];
    references?: SavedObjectCreateOptions['references'];
}
interface SavedSearchUpdateOptions {
    references?: SavedObjectUpdateOptions['references'];
}
interface SavedSearchSearchOptions {
    searchFields?: SavedObjectSearchOptions['searchFields'];
    fields?: SavedObjectSearchOptions['fields'];
}
export type SavedSearchCrudTypes = ContentManagementCrudTypes<SavedSearchContentType, DiscoverSessionAttributes, SavedSearchCreateOptions, SavedSearchUpdateOptions, SavedSearchSearchOptions>;
export {};
