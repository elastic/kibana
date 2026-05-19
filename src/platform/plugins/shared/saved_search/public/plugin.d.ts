import type { ContentManagementPublicSetup, ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SOWithMetadata } from '@kbn/content-management-utils';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { DiscoverSession, SavedSearch, SavedSearchAttributes, SerializableSavedSearch } from '../common/types';
import type { SaveSavedSearchOptions, saveSavedSearch } from './service/save_saved_searches';
import type { SaveDiscoverSessionOptions, SaveDiscoverSessionParams, saveDiscoverSession } from './service/save_discover_session';
import type { SavedSearchUnwrapResult } from './service/to_saved_search';
import { getNewSavedSearch } from '../common/service/get_new_saved_search';
/**
 * Saved search plugin public Setup contract
 */
export interface SavedSearchPublicPluginSetup {
}
/**
 * Saved search plugin public Start contract
 */
export interface SavedSearchPublicPluginStart {
    get: <Serialized extends boolean = false>(savedSearchId: string, serialized?: Serialized) => Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch>;
    getDiscoverSession: (discoverSessionId: string) => Promise<DiscoverSession>;
    getNew: () => ReturnType<typeof getNewSavedSearch>;
    getAll: () => Promise<Array<SOWithMetadata<SavedSearchAttributes>>>;
    save: (savedSearch: SavedSearch, options?: SaveSavedSearchOptions) => ReturnType<typeof saveSavedSearch>;
    saveDiscoverSession: (discoverSession: SaveDiscoverSessionParams, options?: SaveDiscoverSessionOptions) => ReturnType<typeof saveDiscoverSession>;
    hasLibraryItemWithTitle: (title: string) => Promise<boolean>;
    byValueToSavedSearch: <Serialized extends boolean = false>(result: SavedSearchUnwrapResult, serialized?: Serialized) => Promise<Serialized extends true ? SerializableSavedSearch : SavedSearch>;
}
/**
 * Saved search plugin public Setup dependencies
 */
export interface SavedSearchPublicSetupDependencies {
    embeddable: EmbeddableSetup;
    contentManagement: ContentManagementPublicSetup;
    expressions: ExpressionsSetup;
}
/**
 * Saved search plugin public Start dependencies
 */
export interface SavedSearchPublicStartDependencies {
    data: DataPublicPluginStart;
    spaces?: SpacesApi;
    savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
    contentManagement: ContentManagementPublicStart;
    embeddable: EmbeddableStart;
}
export declare class SavedSearchPublicPlugin implements Plugin<SavedSearchPublicPluginSetup, SavedSearchPublicPluginStart, SavedSearchPublicSetupDependencies, SavedSearchPublicStartDependencies> {
    setup({ getStartServices }: CoreSetup, { contentManagement, expressions }: SavedSearchPublicSetupDependencies): {};
    start(_: CoreStart, { data: { search }, spaces, savedObjectsTaggingOss, contentManagement: { client: contentManagement }, }: SavedSearchPublicStartDependencies): SavedSearchPublicPluginStart;
}
