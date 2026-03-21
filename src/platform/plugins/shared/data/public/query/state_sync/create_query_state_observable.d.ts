import { Observable } from 'rxjs';
import type { TimefilterSetup } from '../timefilter';
import type { FilterManager } from '../filter_manager';
import type { QueryState } from '../query_state';
import type { QueryStateChange } from './types';
import type { QueryStringContract } from '../query_string';
export type QueryState$ = Observable<{
    changes: QueryStateChange;
    state: QueryState;
}>;
export declare function createQueryStateObservable({ timefilter, filterManager, queryString, }: {
    timefilter: TimefilterSetup;
    filterManager: FilterManager;
    queryString: QueryStringContract;
}): QueryState$;
