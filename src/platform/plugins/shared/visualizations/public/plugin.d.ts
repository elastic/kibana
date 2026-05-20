import type { Reference } from '@kbn/content-management-utils';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin, ApplicationStart } from '@kbn/core/public';
import type { UiActionsStart, UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { Setup as InspectorSetup, Start as InspectorStart } from '@kbn/inspector-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { NavigationPublicPluginStart as NavigationStart } from '@kbn/navigation-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { UrlForwardingSetup, UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { ContentManagementPublicSetup, ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { NoDataPagePluginStart } from '@kbn/no-data-page-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { TypesSetup, TypesStart } from './vis_types';
import type { VisEditorsRegistry } from './vis_editors_registry';
import { showNewVisModal } from './wizard';
import { findListItems } from './utils/saved_visualize_utils';
import type { ListingViewRegistry } from './types';
/**
 * Interface for this plugin's returned setup/start contracts.
 *
 * @public
 */
export type VisualizationsSetup = TypesSetup & {
    visEditorsRegistry: VisEditorsRegistry;
    listingViewRegistry: ListingViewRegistry;
};
export interface VisualizationsStart extends TypesStart {
    showNewVisModal: typeof showNewVisModal;
    findListItems: (search: string, size: number, references?: Reference[], referencesToExclude?: Reference[]) => ReturnType<typeof findListItems>;
}
export interface VisualizationsSetupDeps {
    data: DataPublicPluginSetup;
    embeddable: EmbeddableSetup;
    expressions: ExpressionsSetup;
    inspector: InspectorSetup;
    uiActions: UiActionsSetup;
    urlForwarding: UrlForwardingSetup;
    home?: HomePublicPluginSetup;
    share?: SharePluginSetup;
    contentManagement: ContentManagementPublicSetup;
}
export interface VisualizationsStartDeps {
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    dataViewEditor: DataViewEditorStart;
    expressions: ExpressionsStart;
    embeddable: EmbeddableStart;
    inspector: InspectorStart;
    uiActions: UiActionsStart;
    application: ApplicationStart;
    navigation: NavigationStart;
    presentationUtil: PresentationUtilPluginStart;
    savedSearch: SavedSearchPublicPluginStart;
    cps?: CPSPluginStart;
    spaces?: SpacesPluginStart;
    savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
    share?: SharePluginStart;
    urlForwarding: UrlForwardingStart;
    screenshotMode: ScreenshotModePluginStart;
    fieldFormats: FieldFormatsStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    kql: KqlPluginStart;
    usageCollection: UsageCollectionStart;
    savedObjectsManagement: SavedObjectsManagementPluginStart;
    contentManagement: ContentManagementPublicStart;
    serverless?: ServerlessPluginStart;
    noDataPage?: NoDataPagePluginStart;
}
/**
 * Visualizations Plugin - public
 *
 * This plugin's stateful contracts are returned from the `setup` and `start` methods
 * below. The interfaces for these contracts are provided above.
 *
 * @internal
 */
export declare class VisualizationsPlugin implements Plugin<VisualizationsSetup, VisualizationsStart, VisualizationsSetupDeps, VisualizationsStartDeps> {
    private initializerContext;
    private readonly types;
    private appStateSubscription?;
    private urlUpdater;
    private visibilityUpdater;
    private appStateUpdater;
    private stopUrlTracking;
    private currentHistory;
    private isLinkedToOriginatingApp;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<VisualizationsStartDeps, VisualizationsStart>, { expressions, embeddable, data, home, urlForwarding, share, uiActions, contentManagement, }: VisualizationsSetupDeps): VisualizationsSetup;
    start(core: CoreStart, { data, expressions, uiActions, embeddable, spaces, savedObjectsTaggingOss, fieldFormats, usageCollection, savedObjectsManagement, contentManagement, savedSearch, dataViews, inspector, serverless, cps, }: VisualizationsStartDeps): VisualizationsStart;
    stop(): void;
}
