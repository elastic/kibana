import type { TimeState } from '@kbn/es-query';
import type { Observable } from 'rxjs';
import type { Timefilter } from './timefilter';
import type { NowProviderInternalContract } from '../../now_provider';
type TimeStateChange = 'initial' | 'shift' | 'override';
export interface TimeStateUpdate {
    timeState: TimeState;
    kind: TimeStateChange;
}
export interface TimefilterHook {
    timeState: TimeState;
    refresh: () => void;
    timeState$: Observable<TimeStateUpdate>;
}
/**
 * Creates a useTimefilter hook that can be used in applications. Here's
 * how the hook works: any time fetch$ (from Timefilter) emits, it will
 * materialize the input time range (where it converts possibly relative
 * time ranges into an absolute time range). This is referred to as the
 * TimeState. It's both returned as state, and an observable. It also
 * exposes a refresh callback - it will simply refresh the current time
 * range. While timeFilter.setTime is memoized, refresh() is not - that
 * means that even if the time changes, timeState$ will emit a new
 * value. Additionally, the kind of change is included:
 * - 'initial' means that this is the first emitted value, based on
 * timeFilter.getTime().
 * - 'shift' means that the absolute time has changed.
 * - 'override' means that the absolute time did NOT change.
 *
 * The reason for 'override' is that quite often, consumers will use
 * the absolute timestamps (in epoch or ISO) to determine whether
 * their state needs to be recalculated (commonly an API request) - but
 * these values will not change in this case. Subscribe to state$, and
 * check for `kind == 'override'` to determine whether a manual refresh
 * is needed.
 */
export declare function createUseTimefilterHook(timefilter: Timefilter, nowProvider: NowProviderInternalContract): () => TimefilterHook;
export {};
