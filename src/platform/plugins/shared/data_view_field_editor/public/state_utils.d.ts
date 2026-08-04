import type { BehaviorSubject } from 'rxjs';
export type BehaviorObservable<T> = Omit<BehaviorSubject<T>, 'next'>;
export declare function useStateSelector<S, R>(state$: BehaviorObservable<S>, selector: (state: S) => R, equalityFn?: (arg0: R, arg1: R) => boolean): R;
