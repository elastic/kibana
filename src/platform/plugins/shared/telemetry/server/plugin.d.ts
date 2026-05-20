import { URL } from 'url';
import { type Observable } from 'rxjs';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { TelemetryCollectionManagerPluginSetup, TelemetryCollectionManagerPluginStart } from '@kbn/telemetry-collection-manager-plugin/server';
import type { CoreSetup, PluginInitializerContext, CoreStart, Plugin } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { TelemetryConfigType } from './config';
interface TelemetryPluginsDepsSetup {
    usageCollection: UsageCollectionSetup;
    telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
}
interface TelemetryPluginsDepsStart {
    telemetryCollectionManager: TelemetryCollectionManagerPluginStart;
    security?: SecurityPluginStart;
}
/**
 * Server's setup exposed APIs by the telemetry plugin
 */
export interface TelemetryPluginSetup {
    /**
     * Resolves into the telemetry Url used to send telemetry.
     * The url is wrapped with node's [URL constructor](https://nodejs.org/api/url.html).
     */
    getTelemetryUrl: () => Promise<URL>;
}
/**
 * Server's start exposed APIs by the telemetry plugin
 */
export interface TelemetryPluginStart {
    /**
     * Resolves `true` if sending usage to Elastic is enabled.
     * Resolves `false` if the user explicitly opted out of sending usage data to Elastic
     * or did not choose to opt-in or out -yet- after a minor or major upgrade (only when previously opted-out).
     *
     * @deprecated Use {@link TelemetryPluginStart.isOptedIn$ | isOptedIn$} instead.
     */
    getIsOptedIn: () => Promise<boolean>;
    /**
     * An Observable object that can be subscribed to for changes in global telemetry config.
     *
     * Pushes `true` when sending usage to Elastic is enabled.
     * Pushes `false` when the user explicitly opts out of sending usage data to Elastic.
     *
     * Additionally, pushes the actual value on Kibana startup, except if the (previously opted-out) user
     * haven't chosen yet to opt-in or out after a minor or major upgrade. In that case, pushing the new
     * value waits until the user decides.
     *
     * @track-adoption
     */
    isOptedIn$: Observable<boolean>;
}
export declare class TelemetryPlugin implements Plugin<TelemetryPluginSetup, TelemetryPluginStart> {
    private readonly logger;
    private readonly currentKibanaVersion;
    private readonly initialConfig;
    private readonly config$;
    private readonly isOptedIn$;
    private isOptedIn?;
    private readonly isDev;
    private readonly fetcherTask;
    private readonly shouldStartSnapshotTelemetryFetcher;
    /**
     * @internal Used to mark the completion of the old UI Settings migration
     */
    private savedObjectsInternalRepository?;
    /**
     * @internal
     * Used to interact with the Telemetry Saved Object.
     * Some users may not have access to the document but some queries
     * are still relevant to them like fetching when was the last time it was reported.
     *
     * Using the internal client in all cases ensures the permissions to interact the document.
     */
    private readonly savedObjectsInternalClient$;
    private readonly pluginStop$;
    private security?;
    constructor(initializerContext: PluginInitializerContext<TelemetryConfigType>);
    setup(coreSetup: CoreSetup, { usageCollection, telemetryCollectionManager }: TelemetryPluginsDepsSetup): TelemetryPluginSetup;
    start(core: CoreStart, { telemetryCollectionManager, security }: TelemetryPluginsDepsStart): {
        getIsOptedIn: () => Promise<boolean>;
        isOptedIn$: Observable<boolean>;
    };
    stop(): void;
    private getSendToEnv;
    private getOptInStatus;
    private startFetcher;
    private registerUsageCollectors;
}
export {};
