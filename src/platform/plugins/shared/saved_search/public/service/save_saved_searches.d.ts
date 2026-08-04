import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SavedSearch } from './types';
export interface SaveSavedSearchOptions {
    copyOnSave?: boolean;
}
/** @internal **/
export declare const saveSavedSearch: (savedSearch: SavedSearch, options: SaveSavedSearchOptions, contentManagement: ContentManagementPublicStart["client"], savedObjectsTagging: SavedObjectsTaggingApi | undefined) => Promise<string | undefined>;
