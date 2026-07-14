import type { Observable } from 'rxjs';
import type { ChangedDeprecatedPaths } from '@kbn/config';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { MetricsServiceSetup } from '@kbn/core-metrics-server';
import type { CoreUsageData, CoreUsageDataStart, ConfigUsageData } from '@kbn/core-usage-data-server';
import { type InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import { type SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
export type ExposedConfigsToUsage = Map<string, Record<string, boolean>>;
export interface SetupDeps {
    http: InternalHttpServiceSetup;
    metrics: MetricsServiceSetup;
    savedObjectsStartPromise: Promise<SavedObjectsServiceStart>;
    changedDeprecatedConfigPath$: Observable<ChangedDeprecatedPaths>;
}
export interface StartDeps {
    savedObjects: SavedObjectsServiceStart;
    elasticsearch: ElasticsearchServiceStart;
    exposedConfigsToUsage: ExposedConfigsToUsage;
}
export declare class CoreUsageDataService implements CoreService<InternalCoreUsageDataSetup, CoreUsageDataStart> {
    private logger;
    private elasticsearchConfig?;
    private configService;
    private httpConfig?;
    private loggingConfig?;
    private soConfig?;
    private stop$;
    private opsMetrics?;
    private coreUsageStatsClient?;
    private deprecatedConfigPaths;
    private incrementUsageCounter;
    private deprecatedApiUsageFetcher;
    constructor(core: CoreContext);
    private getSavedObjectUsageData;
    private getSavedObjectIndicesUsageData;
    private getSavedObjectAliasUsageData;
    private getCoreUsageData;
    private getMarkedAsSafe;
    private getNonDefaultKibanaConfigs;
    setup({ http, metrics, savedObjectsStartPromise, changedDeprecatedConfigPath$ }: SetupDeps): InternalCoreUsageDataSetup;
    start({ savedObjects, elasticsearch, exposedConfigsToUsage }: StartDeps): {
        getCoreUsageData: () => Promise<CoreUsageData>;
        getConfigsUsageData: () => Promise<ConfigUsageData>;
    };
    stop(): void;
}
