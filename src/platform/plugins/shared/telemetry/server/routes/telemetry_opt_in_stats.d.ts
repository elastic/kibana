import type { IRouter } from '@kbn/core/server';
import type { TelemetryCollectionManagerPluginSetup, StatsGetterConfig } from '@kbn/telemetry-collection-manager-plugin/server';
interface SendTelemetryOptInStatusConfig {
    appendServerlessChannelsSuffix: boolean;
    sendUsageTo: 'staging' | 'prod';
    newOptInStatus: boolean;
    currentKibanaVersion: string;
}
export declare function sendTelemetryOptInStatus(telemetryCollectionManager: Pick<TelemetryCollectionManagerPluginSetup, 'getOptInStats'>, config: SendTelemetryOptInStatusConfig, statsGetterConfig: StatsGetterConfig): Promise<void>;
export declare function registerTelemetryOptInStatsRoutes(router: IRouter, telemetryCollectionManager: TelemetryCollectionManagerPluginSetup): void;
export {};
