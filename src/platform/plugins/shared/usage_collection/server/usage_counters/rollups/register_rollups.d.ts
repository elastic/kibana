import { type Observable } from 'rxjs';
import type { Logger, ISavedObjectsRepository } from '@kbn/core/server';
import type { IUsageCounter } from '../usage_counter';
export declare function registerUsageCountersRollups({ logger, getRegisteredUsageCounters, internalRepository, pluginStop$, }: {
    logger: Logger;
    getRegisteredUsageCounters: () => IUsageCounter[];
    internalRepository: ISavedObjectsRepository;
    pluginStop$: Observable<void>;
}): void;
