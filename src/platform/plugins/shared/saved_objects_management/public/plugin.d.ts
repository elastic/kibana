import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { v1 } from '../common';
import type { SavedObjectManagementTypeInfo } from './types';
import { getDefaultTitle, getSavedObjectLabel, getTagFindReferences, parseQuery } from './lib';
export interface SavedObjectsManagementPluginSetup {
}
export interface SavedObjectsManagementPluginStart {
    getAllowedTypes: () => Promise<SavedObjectManagementTypeInfo[]>;
    getRelationships: (type: string, id: string, savedObjectTypes: string[], size?: number) => Promise<v1.RelationshipsResponseHTTP>;
    getSavedObjectLabel: typeof getSavedObjectLabel;
    getDefaultTitle: typeof getDefaultTitle;
    parseQuery: typeof parseQuery;
    getTagFindReferences: typeof getTagFindReferences;
}
export interface SetupDependencies {
    management: ManagementSetup;
    home?: HomePublicPluginSetup;
}
export interface StartDependencies {
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
    spaces?: SpacesPluginStart;
}
export declare class SavedObjectsManagementPlugin implements Plugin<SavedObjectsManagementPluginSetup, SavedObjectsManagementPluginStart, SetupDependencies, StartDependencies> {
    private actionService;
    private columnService;
    private actionServiceStart?;
    private columnServiceStart?;
    setup(core: CoreSetup<StartDependencies, SavedObjectsManagementPluginStart>, { home, management }: SetupDependencies): SavedObjectsManagementPluginSetup;
    start(_core: CoreStart, { spaces: spacesApi }: StartDependencies): {
        getAllowedTypes: () => Promise<v1.SavedObjectManagementTypeInfo[]>;
        getRelationships: (type: string, id: string, savedObjectTypes: string[], size?: number) => Promise<v1.RelationshipsResponseHTTP>;
        getSavedObjectLabel: typeof getSavedObjectLabel;
        getDefaultTitle: typeof getDefaultTitle;
        parseQuery: typeof parseQuery;
        getTagFindReferences: ({ selectedTags, taggingApi, }: {
            selectedTags?: string[];
            taggingApi?: import("@kbn/saved-objects-tagging-oss-plugin/public").SavedObjectsTaggingApi;
        }) => import("@kbn/core/public").SavedObjectsFindOptionsReference[] | undefined;
    };
}
