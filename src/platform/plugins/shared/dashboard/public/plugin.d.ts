import type { ContentManagementPublicSetup, ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import type { Plugin, PluginInitializerContext } from '@kbn/core/public';
import { type CoreSetup, type CoreStart } from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public/plugin';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { NoDataPagePluginStart } from '@kbn/no-data-page-plugin/public';
import type { ObservabilityAIAssistantPublicSetup, ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ScreenshotModePluginSetup, ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { type UiActionsSetup, type UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { UrlForwardingSetup, UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import type { UsageCollectionSetup, UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { DashboardListingTab } from './dashboard_listing/types';
import type { FindDashboardsService } from './dashboard_client';
import type { DashboardApi } from './dashboard_api/types';
export interface DashboardSetupDependencies {
    data: DataPublicPluginSetup;
    embeddable: EmbeddableSetup;
    home?: HomePublicPluginSetup;
    contentManagement: ContentManagementPublicSetup;
    screenshotMode: ScreenshotModePluginSetup;
    share?: SharePluginSetup;
    usageCollection?: UsageCollectionSetup;
    uiActions: UiActionsSetup;
    urlForwarding: UrlForwardingSetup;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
    lens?: LensPublicSetup;
}
export interface DashboardStartDependencies {
    data: DataPublicPluginStart;
    dataViewEditor: DataViewEditorStart;
    embeddable: EmbeddableStart;
    fieldFormats: FieldFormatsStart;
    inspector: InspectorStartContract;
    navigation: NavigationPublicPluginStart;
    presentationUtil: PresentationUtilPluginStart;
    contentManagement: ContentManagementPublicStart;
    savedObjectsManagement: SavedObjectsManagementPluginStart;
    savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
    screenshotMode: ScreenshotModePluginStart;
    share?: SharePluginStart;
    spaces?: SpacesPluginStart;
    uiActions: UiActionsStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    urlForwarding: UrlForwardingStart;
    usageCollection?: UsageCollectionStart;
    customBranding: CustomBrandingStart;
    serverless?: ServerlessPluginStart;
    noDataPage?: NoDataPagePluginStart;
    lens?: LensPublicStart;
    observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
    cps?: CPSPluginStart;
}
export interface DashboardSetup {
    registerListingPageTab: (tab: DashboardListingTab) => void;
}
/**
 * The start contract for the Dashboard plugin.
 * Provides services for interacting with dashboards from other plugins.
 */
export interface DashboardStart {
    /**
     * Returns the service for finding dashboards.
     *
     * @returns A promise that resolves to the {@link FindDashboardsService}.
     */
    findDashboardsService: () => Promise<FindDashboardsService>;
    dashboardAppClientApi$: PublishingSubject<DashboardApi | undefined>;
}
export declare class DashboardPlugin implements Plugin<DashboardSetup, DashboardStart, DashboardSetupDependencies, DashboardStartDependencies> {
    constructor(initializerContext: PluginInitializerContext);
    private appStateSubscription?;
    private appStateUpdater;
    private urlUpdater;
    private deepLinksUpdater;
    private stopUrlTracking;
    private currentHistory;
    private listingViewRegistry;
    private dashboardAppApi$;
    setup(core: CoreSetup<DashboardStartDependencies, DashboardStart>, { embeddable, share, home, data, urlForwarding }: DashboardSetupDependencies): DashboardSetup;
    start(core: CoreStart, plugins: DashboardStartDependencies): DashboardStart;
    stop(): void;
}
