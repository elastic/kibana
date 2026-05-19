import type { DependencyList } from 'react';
interface State<T> {
    error?: Error;
    value?: T;
    loading: boolean;
}
export type AbortableAsyncState<T> = (T extends Promise<infer TReturn> ? State<TReturn> : State<T>) & {
    refresh: () => void;
};
export type AbortableAsyncStateOf<T extends AbortableAsyncState<unknown>> = T extends AbortableAsyncState<infer TResponse> ? Awaited<TResponse> : never;
export interface UseAbortableAsyncOptions<T> {
    clearValueOnNext?: boolean;
    unsetValueOnError?: boolean;
    defaultValue?: () => T;
    onError?: (error: Error) => void;
}
export type UseAbortableAsync<TAdditionalParameters extends Record<string, unknown> = Record<string, never>, TAdditionalOptions extends Record<string, unknown> = Record<string, never>> = <T>(fn: ({}: {
    signal: AbortSignal;
} & TAdditionalParameters) => T | Promise<T>, deps: DependencyList, options?: UseAbortableAsyncOptions<T> & TAdditionalOptions) => AbortableAsyncState<T>;
export declare function useAbortableAsync<T>(fn: ({}: {
    signal: AbortSignal;
}) => T | Promise<T>, deps: DependencyList, options?: UseAbortableAsyncOptions<T>): AbortableAsyncState<T>;
export {};
