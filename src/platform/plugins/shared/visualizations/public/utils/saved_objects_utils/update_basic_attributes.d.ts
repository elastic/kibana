import type { HttpStart } from '@kbn/core/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { TypesStart } from '../../vis_types';
interface UpdateBasicSoAttributesDependencies {
    savedObjectsTagging?: SavedObjectsTaggingApi;
    overlays: OverlayStart;
    typesService: TypesStart;
    contentManagement: ContentManagementPublicStart;
    http: HttpStart;
}
export declare const updateBasicSoAttributes: (id: string, type: string, newAttributes: {
    title: string;
    description: string;
    tags: string[];
}, dependencies: UpdateBasicSoAttributesDependencies) => Promise<{
    item: import("@kbn/content-management-utils").SOWithMetadataPartial<import("../../vis_types").SerializableAttributes>;
    meta?: never;
}>;
export declare const deleteSOByType: (id: string, type: string, dependencies: UpdateBasicSoAttributesDependencies) => Promise<void>;
export declare const deleteListItems: (items: object[], // can be any SO item type from the vis page
dependencies: UpdateBasicSoAttributesDependencies) => Promise<void[]>;
export {};
