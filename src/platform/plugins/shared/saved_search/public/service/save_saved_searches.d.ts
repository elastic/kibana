import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { Reference } from '@kbn/content-management-utils';
import type { SavedSearch } from './types';
import type { SavedSearchAttributes } from '../../common';
export interface SaveSavedSearchOptions {
    copyOnSave?: boolean;
}
export declare const saveSearchSavedObject: (id: string | undefined, attributes: SavedSearchAttributes, references: Reference[] | undefined, contentManagement: ContentManagementPublicStart["client"]) => Promise<string>;
/** @internal **/
export declare const saveSavedSearch: (savedSearch: SavedSearch, options: SaveSavedSearchOptions, contentManagement: ContentManagementPublicStart["client"], savedObjectsTagging: SavedObjectsTaggingApi | undefined) => Promise<string | undefined>;
