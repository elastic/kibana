import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { DiscoverSession } from '../../common';
export type SaveDiscoverSessionParams = Pick<DiscoverSession, 'title' | 'description' | 'tabs' | 'tags'> & Partial<Pick<DiscoverSession, 'id'>>;
export interface SaveDiscoverSessionOptions {
    copyOnSave?: boolean;
}
export declare const saveDiscoverSession: (discoverSession: SaveDiscoverSessionParams, options: SaveDiscoverSessionOptions, contentManagement: ContentManagementPublicStart["client"], savedObjectsTagging: SavedObjectsTaggingApi | undefined) => Promise<DiscoverSession | undefined>;
