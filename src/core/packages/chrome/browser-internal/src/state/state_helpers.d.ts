import { type Observable } from 'rxjs';
export interface State<T> {
    /** Stable observable - same reference every call */
    $: Observable<T>;
    /** Get current value synchronously */
    get: () => T;
    /** Set new value */
    set: (value: T) => void;
    /** Update value using transformer function */
    update: (fn: (current: T) => T) => void;
}
export interface ArrayState<T> extends State<T[]> {
    /** Add item to array */
    add: (item: T) => void;
    /** Add item and sort */
    addSorted: (item: T, compareFn: (a: T, b: T) => number) => void;
    /** Remove items matching predicate */
    remove: (predicate: (item: T) => boolean) => void;
    /** Clear all items */
    clear: () => void;
}
/** State persisted to localStorage */
export interface PersistedState<T> extends State<T> {
    /** Clear from localStorage and reset to initial value */
    reset: () => void;
}
export declare function createState<T>(initialValue: T): State<T>;
export declare function createArrayState<T>(initialValue?: T[]): ArrayState<T>;
export declare function createPersistedState<T>(key: string, initialValue: T, serialize?: (value: T) => string, deserialize?: (raw: string) => T): PersistedState<T>;
