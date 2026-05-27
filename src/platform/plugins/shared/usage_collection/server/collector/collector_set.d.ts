import type { Logger, ElasticsearchClient, SavedObjectsClientContract, ExecutionContextSetup } from '@kbn/core/server';
import { Collector } from './collector';
import type { ICollector, CollectorOptions, ICollectorSet } from './types';
import { UsageCollector, type UsageCollectorOptions } from './usage_collector';
type AnyCollector = ICollector<any, any>;
export interface CollectorSetConfig {
    logger: Logger;
    executionContext: ExecutionContextSetup;
    maximumWaitTimeForAllCollectorsInS?: number;
    collectors?: AnyCollector[];
    maxCollectorConcurrency?: number;
}
export declare class CollectorSet implements ICollectorSet {
    private readonly logger;
    private readonly executionContext;
    private readonly maximumWaitTimeForAllCollectorsInS;
    private readonly collectors;
    private readonly fetchingCollectors;
    private readonly maxCollectorConcurrency;
    constructor({ logger, executionContext, maximumWaitTimeForAllCollectorsInS, collectors, maxCollectorConcurrency, }: CollectorSetConfig);
    /**
     * Instantiates a stats collector with the definition provided in the options
     * @param options Definition of the collector {@link CollectorOptions}
     */
    makeStatsCollector: <TFetchReturn, ExtraOptions extends object = {}>(options: CollectorOptions<TFetchReturn, ExtraOptions>) => Collector<TFetchReturn, ExtraOptions>;
    /**
     * Instantiates an usage collector with the definition provided in the options
     * @param options Definition of the collector {@link CollectorOptions}
     */
    makeUsageCollector: <TFetchReturn, ExtraOptions extends object = {}>(options: UsageCollectorOptions<TFetchReturn, ExtraOptions>) => UsageCollector<TFetchReturn, ExtraOptions>;
    /**
     * Registers a collector to be used when collecting all the usage and stats data
     * @param collector Collector to be added to the set (previously created via `makeUsageCollector` or `makeStatsCollector`)
     */
    registerCollector: <TFetchReturn, ExtraOptions extends object>(collector: Collector<TFetchReturn, ExtraOptions>) => void;
    getCollectorByType: (type: string) => AnyCollector | undefined;
    private getReadyCollectors;
    private fetchCollector;
    bulkFetch: (esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, collectors?: Map<string, AnyCollector>) => Promise<{
        type: string;
        result: unknown;
    }[]>;
    private getFilteredCollectorSet;
    bulkFetchUsage: (esClient: ElasticsearchClient, savedObjectsClient: SavedObjectsClientContract) => Promise<{
        type: string;
        result: unknown;
    }[]>;
    /**
     * Convert an array of fetched stats results into key/object
     * @param statsData Array of fetched stats results
     */
    toObject: <Result extends Record<string, unknown>, T = unknown>(statsData?: Array<{
        type: string;
        result: T;
    }>) => Result;
    /**
     * Rename fields to use API conventions
     * @param apiData Data to be normalized
     */
    toApiFieldNames: (apiData: Record<string, unknown> | unknown[]) => Record<string, unknown> | unknown[];
    private getValueOrRecurse;
    private makeCollectorSetFromArray;
}
export {};
