import type { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
/** Configuration schema for the Dashboard plugin. */
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * this config is unused, but cannot be removed as removing a yml setting is a breaking change.
     * This can be removed in 10.0. https://github.com/elastic/kibana/issues/221197
     */
    allowByValueEmbeddables: import("@kbn/config-schema").Type<boolean>;
}>;
export declare const config: PluginConfigDescriptor<TypeOf<typeof configSchema>>;
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").DashboardPlugin>;
export type { DashboardPluginSetup, DashboardPluginStart } from './types';
export type { DashboardState, DashboardPanel, DashboardPinnedPanelsState, DashboardPinnedPanel, DashboardSection, DashboardOptions, DashboardSanitizeResponseBody, DashboardCreateResponseBody, DashboardReadResponseBody, DashboardSearchRequestParams, DashboardSearchResponseBody, DashboardUpdateResponseBody, GridData, } from './api';
export type { DashboardDrilldownState } from './dashboard_drilldown/types';
export type { DashboardSavedObjectAttributes, SavedDashboardPanel } from './dashboard_saved_object';
export type { ScanDashboardsResult } from './scan_dashboards';
export { DASHBOARD_API_PATH } from '../common/constants';
