import type { Logger } from '@kbn/core/server';
import type { CollectorFetchMethod, CollectorOptions, ICollector } from './types';
export declare class Collector<TFetchReturn, ExtraOptions extends object = {}> implements ICollector<TFetchReturn, ExtraOptions> {
    readonly log: Logger;
    readonly type: CollectorOptions<TFetchReturn>['type'];
    readonly fetch: CollectorFetchMethod<TFetchReturn, ExtraOptions>;
    readonly isReady: CollectorOptions<TFetchReturn>['isReady'];
    /**
     * @internal Constructor of a Collector. It should be called via the CollectorSet factory methods: `makeStatsCollector` and `makeUsageCollector`
     * @param log {@link Logger}
     * @param collectorDefinition {@link CollectorOptions}
     */
    constructor(log: Logger, { type, fetch, isReady, ...options }: CollectorOptions<TFetchReturn, ExtraOptions>);
}
