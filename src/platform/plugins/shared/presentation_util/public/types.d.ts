import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
export interface PresentationUtilPluginSetup {
}
export interface PresentationUtilPluginStart {
}
export interface PresentationUtilPluginSetupDeps {
}
export interface PresentationUtilPluginStartDeps {
    dataViews: DataViewsPublicPluginStart;
    uiActions: UiActionsStart;
}
