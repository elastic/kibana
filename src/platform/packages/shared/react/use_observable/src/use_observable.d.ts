export interface Observable<T> {
    subscribe: (listener: (value: T) => void) => {
        unsubscribe: () => void;
    };
}
export interface ValueObservable<T> extends Observable<T> {
    getValue: () => T;
}
export declare function useObservable<T>(observable$: ValueObservable<T>): T;
export declare function useObservable<T>(observable$: Observable<T>, initialValue: T): T;
export declare function useObservable<T>(observable$: Observable<T>): T | undefined;
