import type { QueryState } from '../../common';
import type { TimefilterSetup } from './timefilter';
import type { FilterManager } from './filter_manager';
import type { QueryStringContract } from './query_string';
export type { QueryState };
export declare function getQueryState({ timefilter: { timefilter }, filterManager, queryString, }: {
    timefilter: TimefilterSetup;
    filterManager: FilterManager;
    queryString: QueryStringContract;
}): QueryState;
