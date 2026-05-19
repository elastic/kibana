import type { Filter } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-service-server';
import type { QueryState } from '../query_state';
import type { TimeRange } from '../../../common/types';
type QueryStateChangePartial = {
    [P in keyof QueryState]?: boolean;
};
export interface QueryStateChange extends QueryStateChangePartial {
    appFilters?: boolean;
    globalFilters?: boolean;
}
/**
 * Part of {@link QueryState} serialized in the `_g` portion of Url
 */
export interface GlobalQueryStateFromUrl {
    time?: TimeRange;
    refreshInterval?: RefreshInterval;
    filters?: Filter[];
}
export {};
