import type { IRouter } from '@kbn/core/server';
import type { TelemetryCollectionManagerPluginSetup } from '@kbn/telemetry-collection-manager-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
export type SecurityGetter = () => SecurityPluginStart | undefined;
export declare function registerTelemetryUsageStatsRoutes(router: IRouter, telemetryCollectionManager: TelemetryCollectionManagerPluginSetup, isDev: boolean, getSecurity: SecurityGetter): void;
