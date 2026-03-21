import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
export interface PresentationPanelSetup {
}
export interface PresentationPanelStart {
}
export interface PresentationPanelSetupDependencies {
}
export interface PresentationPanelStartDependencies {
    uiActions: UiActionsStart;
    inspector: InspectorStart;
    usageCollection: UsageCollectionStart;
    contentManagement: ContentManagementPublicStart;
    savedObjectsManagement: SavedObjectsManagementPluginStart;
    savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
}
export declare class PresentationPanelPlugin implements Plugin<PresentationPanelSetup, PresentationPanelStart, PresentationPanelSetupDependencies, PresentationPanelStartDependencies> {
    setup(_coreSetup: CoreSetup<PresentationPanelSetupDependencies, PresentationPanelStart>, _setupPlugins: PresentationPanelSetupDependencies): PresentationPanelSetup;
    start(coreStart: CoreStart, startPlugins: PresentationPanelStartDependencies): PresentationPanelStart;
    stop(): void;
}
