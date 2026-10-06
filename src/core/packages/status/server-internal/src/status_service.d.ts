import { type Observable } from 'rxjs';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { PluginName } from '@kbn/core-base-common';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { InternalEnvironmentServiceSetup } from '@kbn/core-environment-server-internal';
import type { InternalHttpServiceSetup, InternalHttpServicePreboot } from '@kbn/core-http-server-internal';
import type { InternalRateLimiterSetup } from '@kbn/core-http-rate-limiter-server-internal';
import type { InternalElasticsearchServiceSetup } from '@kbn/core-elasticsearch-server-internal';
import type { InternalMetricsServiceSetup } from '@kbn/core-metrics-server-internal';
import type { InternalSavedObjectsServiceSetup } from '@kbn/core-saved-objects-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import { type ServiceStatus, type CoreStatus } from '@kbn/core-status-common';
import type { ILoggingSystem } from '@kbn/core-logging-server-internal';
import type { InternalStatusServiceSetup } from './types';
export interface StatusServicePrebootDeps {
    http: InternalHttpServicePreboot;
}
export interface StatusServiceSetupDeps {
    analytics: AnalyticsServiceSetup;
    elasticsearch: Pick<InternalElasticsearchServiceSetup, 'status$'>;
    environment: InternalEnvironmentServiceSetup;
    pluginDependencies: ReadonlyMap<PluginName, PluginName[]>;
    http: InternalHttpServiceSetup;
    httpRateLimiter: Pick<InternalRateLimiterSetup, 'status$'>;
    metrics: InternalMetricsServiceSetup;
    savedObjects: Pick<InternalSavedObjectsServiceSetup, 'status$'>;
    coreUsageData: Pick<InternalCoreUsageDataSetup, 'incrementUsageCounter'>;
    loggingSystem: Pick<ILoggingSystem, 'setGlobalContext'>;
}
export declare class StatusService implements CoreService<InternalStatusServiceSetup> {
    private readonly coreContext;
    private readonly logger;
    private readonly config$;
    private readonly stop$;
    private core$?;
    private overall$?;
    private pluginsStatus?;
    private subscriptions;
    constructor(coreContext: CoreContext);
    preboot({ http }: StatusServicePrebootDeps): Promise<void>;
    setup({ analytics, elasticsearch, pluginDependencies, http, httpRateLimiter, metrics, savedObjects, environment, coreUsageData, loggingSystem, }: StatusServiceSetupDeps): Promise<{
        core$: Observable<CoreStatus>;
        coreOverall$: Observable<ServiceStatus<unknown>>;
        overall$: Observable<ServiceStatus<unknown>>;
        plugins: {
            set: (plugin: PluginName, status$: Observable<ServiceStatus>) => void;
            getDependenciesStatus$: (plugin: PluginName) => Observable<Record<PluginName, import("./types").PluginStatus>>;
            getDerivedStatus$: (plugin: PluginName) => Observable<import("./types").PluginStatus>;
        };
        isStatusPageAnonymous: () => boolean;
    }>;
    start(): void;
    stop(): void;
    private setupCoreStatus;
    private setupAnalyticsContextAndEvents;
    private logStatusChanges;
}
