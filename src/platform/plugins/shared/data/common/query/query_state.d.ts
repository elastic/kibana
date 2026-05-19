import type { Filter } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-service-server';
import type { TimeRange } from './timefilter/types';
import type { Query, AggregateQuery } from './types';
/**
 * All query state service state
 *
 * @remark
 * `type` instead of `interface` to make it compatible with PersistableState utils
 *
 */
export type QueryState = {
    time?: TimeRange;
    refreshInterval?: RefreshInterval;
    filters?: Filter[];
    query?: Query | AggregateQuery;
};
