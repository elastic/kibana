import type { AsyncState } from 'react-use/lib/useAsyncFn';
import type { FunctionReturningPromise } from 'react-use/lib/misc/types';
export declare const useAsyncFunction: <T extends FunctionReturningPromise>(asyncFunction: T, initialState?: AsyncState<Awaited<ReturnType<T>>>) => readonly [{
    loading: false;
    error: Error;
    value?: undefined;
} | {
    loading: true;
    error?: Error | undefined;
    value?: import("react-use/lib/misc/types").PromiseType<ReturnType<T>> | undefined;
} | Exclude<{
    loading: false;
    error?: undefined;
    value: import("react-use/lib/misc/types").PromiseType<ReturnType<T>>;
}, {
    error?: undefined;
    value?: undefined;
}>, T];
