import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { type PresentationLabsService } from '.';
import type { getPanelPlacementSettings, registerPanelPlacementSettings } from './registries/panel_placement';
export interface PresentationUtilPluginSetup {
    registerPanelPlacementSettings: typeof registerPanelPlacementSettings;
}
export interface PresentationUtilPluginStart {
    labsService: PresentationLabsService;
    /**
     * @deprecated
     *
     * Use setup.registerPanelPlacementSettings
     */
    registerPanelPlacementSettings: typeof registerPanelPlacementSettings;
    getPanelPlacementSettings: typeof getPanelPlacementSettings;
}
export interface PresentationUtilPluginSetupDeps {
}
export interface PresentationUtilPluginStartDeps {
    dataViews: DataViewsPublicPluginStart;
    uiActions: UiActionsStart;
}
