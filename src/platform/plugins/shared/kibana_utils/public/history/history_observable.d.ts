import type { Action, History, Location } from 'history';
import { Observable } from 'rxjs';
import type { ParsedQuery } from 'query-string';
/**
 * Convert history.listen into an observable
 * @param history - {@link History} instance
 */
export declare function createHistoryObservable(history: History): Observable<{
    location: Location;
    action: Action;
}>;
/**
 * Create an observable that emits every time any of query params change.
 * Uses deepEqual check.
 * @param history - {@link History} instance
 */
export declare function createQueryParamsObservable(history: History): Observable<ParsedQuery>;
/**
 * Create an observable that emits every time _paramKey_ changes
 * @param history - {@link History} instance
 * @param paramKey - query param key to observe
 */
export declare function createQueryParamObservable<Param = unknown>(history: History, paramKey: string): Observable<Param | null>;
