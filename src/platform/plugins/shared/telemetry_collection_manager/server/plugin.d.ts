import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { TelemetryCollectionManagerPluginSetup, TelemetryCollectionManagerPluginStart, BasicStatsPayload, CollectionStrategyConfig, UsageStatsPayload, OptInStatsPayload, UnencryptedStatsGetterConfig, EncryptedStatsGetterConfig } from './types';
interface TelemetryCollectionPluginsDepsSetup {
    usageCollection: UsageCollectionSetup;
}
export declare class TelemetryCollectionManagerPlugin implements Plugin<TelemetryCollectionManagerPluginSetup, TelemetryCollectionManagerPluginStart> {
    private readonly logger;
    private collectionStrategy;
    private usageGetterMethodPriority;
    private coreStatus$;
    private usageCollection?;
    private elasticsearchClient?;
    private savedObjectsService?;
    private readonly isDistributable;
    private readonly version;
    private cacheManager;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup, { usageCollection }: TelemetryCollectionPluginsDepsSetup): {
        setCollectionStrategy: <T extends BasicStatsPayload>(collectionConfig: CollectionStrategyConfig<T>) => void;
        getOptInStats: {
            (optInStatus: boolean, config: UnencryptedStatsGetterConfig): Promise<Array<{
                clusterUuid: string;
                stats: OptInStatsPayload;
            }>>;
            (optInStatus: boolean, config: EncryptedStatsGetterConfig): Promise<Array<{
                clusterUuid: string;
                stats: string;
            }>>;
        };
        getStats: {
            (config: UnencryptedStatsGetterConfig): Promise<Array<{
                clusterUuid: string;
                stats: UsageStatsPayload;
            }>>;
            (config: EncryptedStatsGetterConfig): Promise<Array<{
                clusterUuid: string;
                stats: string;
            }>>;
        };
        shouldGetTelemetry: () => Promise<boolean>;
    };
    start(core: CoreStart): {
        getOptInStats: {
            (optInStatus: boolean, config: UnencryptedStatsGetterConfig): Promise<Array<{
                clusterUuid: string;
                stats: OptInStatsPayload;
            }>>;
            (optInStatus: boolean, config: EncryptedStatsGetterConfig): Promise<Array<{
                clusterUuid: string;
                stats: string;
            }>>;
        };
        getStats: {
            (config: UnencryptedStatsGetterConfig): Promise<Array<{
                clusterUuid: string;
                stats: UsageStatsPayload;
            }>>;
            (config: EncryptedStatsGetterConfig): Promise<Array<{
                clusterUuid: string;
                stats: string;
            }>>;
        };
        shouldGetTelemetry: () => Promise<boolean>;
    };
    stop(): void;
    /**
     * Checks if Kibana is in a healthy state to attempt the Telemetry report generation:
     * - Elasticsearch is active.
     * - SavedObjects client is active.
     * @internal
     */
    private shouldGetTelemetry;
    private setCollectionStrategy;
    /**
     * Returns the context to provide to the Collection Strategies.
     * It may return undefined if the ES and SO clients are not initialised yet.
     * @param config {@link StatsGetterConfig}
     * @param usageCollection {@link UsageCollectionSetup}
     * @internal
     */
    private getStatsCollectionConfig;
    /**
     * Returns the ES client scoped to the requester or Kibana's internal user
     * depending on whether the request is encrypted or not:
     * If the request is unencrypted, we intentionally scope the results to "what the user can see".
     * @param config {@link StatsGetterConfig}
     * @internal
     */
    private getElasticsearchClient;
    /**
     * Returns the SavedObjects client scoped to the requester or Kibana's internal user
     * depending on whether the request is encrypted or not:
     * If the request is unencrypted, we intentionally scope the results to "what the user can see"
     * @param config {@link StatsGetterConfig}
     * @internal
     */
    private getSavedObjectsClient;
    private getOptInStats;
    private getOptInStatsForCollection;
    private getStats;
    private createCacheKey;
    private updateFetchedAt;
    private getUsageForCollection;
    private getStatsFromCollection;
}
export {};
