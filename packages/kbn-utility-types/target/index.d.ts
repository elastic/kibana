import { PromiseType } from 'utility-types';
/**
 * Returns wrapped type of a promise.
 */
export declare type UnwrapPromise<T extends Promise<any>> = PromiseType<T>;
/**
 * Minimal interface for an object resembling an `Observable`.
 */
export interface ObservableLike<T> {
    subscribe(observer: (value: T) => void): void;
}
/**
 * Returns wrapped type of an observable.
 */
export declare type UnwrapObservable<T extends ObservableLike<any>> = T extends ObservableLike<infer U> ? U : never;
/**
 * Converts a type to a `Promise`, unless it is already a `Promise`. Useful when proxying the return value of a possibly async function.
 */
export declare type ShallowPromise<T> = T extends Promise<infer U> ? Promise<U> : Promise<T>;
//# sourceMappingURL=index.d.ts.map