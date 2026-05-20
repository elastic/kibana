import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { ContentManagementPublicSetup, ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public/types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { EventAnnotationService } from './event_annotation_service';
export interface EventAnnotationStartDependencies {
    data: DataPublicPluginStart;
    savedObjectsTagging: SavedObjectTaggingPluginStart;
    presentationUtil: PresentationUtilPluginStart;
    dataViews: DataViewsPublicPluginStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    contentManagement: ContentManagementPublicStart;
}
interface SetupDependencies {
    expressions: ExpressionsSetup;
    contentManagement: ContentManagementPublicSetup;
}
/** @public */
export type EventAnnotationPluginStart = EventAnnotationService;
export type EventAnnotationPluginSetup = void;
/** @public */
export declare class EventAnnotationPlugin implements Plugin<EventAnnotationPluginSetup, EventAnnotationService> {
    setup(core: CoreSetup<EventAnnotationStartDependencies, EventAnnotationService>, dependencies: SetupDependencies): void;
    start(core: CoreStart, startDependencies: EventAnnotationStartDependencies): EventAnnotationService;
}
export {};
