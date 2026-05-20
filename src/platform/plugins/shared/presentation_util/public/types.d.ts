import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { type PresentationLabsService } from '.';
export interface PresentationUtilPluginSetup {
}
export interface PresentationUtilPluginStart {
    labsService: PresentationLabsService;
}
export interface PresentationUtilPluginSetupDeps {
}
export interface PresentationUtilPluginStartDeps {
    dataViews: DataViewsPublicPluginStart;
    uiActions: UiActionsStart;
}
