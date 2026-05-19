import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { SavedSearch, SerializableSavedSearch } from '../../common/types';
import type { SaveSavedSearchOptions } from './save_saved_searches';
import type { SaveDiscoverSessionOptions, SaveDiscoverSessionParams } from './save_discover_session';
import type { SavedSearchUnwrapResult } from './to_saved_search';
export interface SavedSearchesServiceDeps {
    search: DataPublicPluginStart['search'];
    contentManagement: ContentManagementPublicStart['client'];
    spaces?: SpacesApi;
    savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
}
export declare class SavedSearchesService {
    private deps;
    constructor(deps: SavedSearchesServiceDeps);
    get: <Serialized extends boolean = false>(savedSearchId: string, serialized?: Serialized) => Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch>;
    getDiscoverSession: (discoverSessionId: string) => Promise<import("../../common").DiscoverSession>;
    getAll: () => Promise<import("@kbn/content-management-utils").SOWithMetadata<import("../../common").SavedSearchAttributes>[]>;
    find: (search: string) => Promise<import("@kbn/content-management-utils").SOWithMetadata<import("../../common").SavedSearchAttributes>[]>;
    save: (savedSearch: SavedSearch, options?: SaveSavedSearchOptions) => Promise<string | undefined>;
    saveDiscoverSession: (discoverSession: SaveDiscoverSessionParams, options?: SaveDiscoverSessionOptions) => Promise<import("../../common").DiscoverSession | undefined>;
    hasLibraryItemWithTitle: (title: string) => Promise<boolean>;
    byValueToSavedSearch: <Serialized extends boolean = false>(result: SavedSearchUnwrapResult, serialized?: Serialized) => Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch>;
}
