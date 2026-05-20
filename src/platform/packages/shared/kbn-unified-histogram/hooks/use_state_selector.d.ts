import type { Observable } from 'rxjs';
export declare const useStateSelector: <S, R>(state$: Observable<S> | undefined, selector: (state: S) => R, equalityFn?: (arg0: R, arg1: R) => boolean) => R | undefined;
