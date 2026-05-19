import type { TelemetryCollectionManagerPluginStart } from '@kbn/telemetry-collection-manager-plugin/server';
import { type PluginInitializerContext, type CoreStart } from '@kbn/core/server';
import type { TelemetryConfigType } from './config';
export interface FetcherTaskDepsStart {
    telemetryCollectionManager: TelemetryCollectionManagerPluginStart;
}
export declare class FetcherTask {
    private readonly initialCheckDelayMs;
    private readonly connectivityCheckIntervalMs;
    private readonly config$;
    private readonly currentKibanaVersion;
    private readonly logger;
    private readonly subscriptions;
    private readonly isOnline$;
    private readonly lastReported$;
    private internalRepository?;
    private telemetryCollectionManager?;
    constructor(initializerContext: PluginInitializerContext<TelemetryConfigType>);
    start({ savedObjects }: CoreStart, { telemetryCollectionManager }: FetcherTaskDepsStart): void;
    stop(): void;
    /**
     * Periodically validates the connectivity from the server to our remote telemetry URL.
     * OPTIONS is less intrusive as it does not contain any payload and is used here to check if the endpoint is reachable.
     */
    private validateConnectivity;
    private startSendIfDueSubscription;
    private sendIfDue;
    private getCurrentConfigs;
    private updateLastReported;
    private updateReportFailure;
    private shouldSendReport;
    private fetchTelemetry;
    private sendTelemetry;
}
