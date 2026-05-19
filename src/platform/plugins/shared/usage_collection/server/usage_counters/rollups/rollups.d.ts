import type moment from 'moment';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { IUsageCounter } from '../usage_counter';
export declare function rollUsageCountersIndices({ logger, getRegisteredUsageCounters, internalRepository, now, }: {
    logger: Logger;
    getRegisteredUsageCounters: () => IUsageCounter[];
    internalRepository?: ISavedObjectsRepository;
    now?: moment.Moment;
}): Promise<number | undefined>;
