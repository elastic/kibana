import type { SavedObjectsServiceSetup, SavedObjectsServiceStart } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { UsageCountersServiceSetup, UsageCountersServiceStart } from './types';
export interface UsageCountersServiceDeps {
    logger: Logger;
    retryCount: number;
    bufferDurationMs: number;
}
export interface UsageCountersServiceSetupDeps {
    savedObjects: SavedObjectsServiceSetup;
}
export interface UsageCountersServiceStartDeps {
    savedObjects: SavedObjectsServiceStart;
}
export declare class UsageCountersService {
    private readonly stop$;
    private readonly retryCount;
    private readonly bufferDurationMs;
    private readonly counterSets;
    private readonly source$;
    private readonly counter$;
    private readonly flushCache$;
    private readonly stopCaching$;
    private repository?;
    private readonly logger;
    constructor({ logger, retryCount, bufferDurationMs }: UsageCountersServiceDeps);
    setup: ({ savedObjects }: UsageCountersServiceSetupDeps) => UsageCountersServiceSetup;
    start: ({ savedObjects }: UsageCountersServiceStartDeps) => UsageCountersServiceStart;
    stop: () => UsageCountersServiceStart;
    private backoffDelay;
    private storeDate$;
    private createUsageCounter;
    private getUsageCounterByDomainId;
    private mergeCounters;
    private search;
}
