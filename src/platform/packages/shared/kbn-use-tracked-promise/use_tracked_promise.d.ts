import type { DependencyList } from 'react';
interface UseTrackedPromiseArgs<Arguments extends unknown[], Result> {
    createPromise: (...args: Arguments) => Promise<Result>;
    onResolve?: (result: Result) => void;
    onReject?: (value: unknown) => void;
    cancelPreviousOn?: 'creation' | 'settlement' | 'resolution' | 'rejection' | 'never';
    triggerOrThrow?: 'always' | 'whenMounted';
}
/**
 * This hook manages a Promise factory and can create new Promises from it. The
 * state of these Promises is tracked and they can be canceled when superseded
 * to avoid race conditions.
 *
 * ```
 * const [requestState, performRequest] = useTrackedPromise(
 *   {
 *     cancelPreviousOn: 'resolution',
 *     createPromise: async (url: string) => {
 *       return await fetchSomething(url)
 *     },
 *     onResolve: response => {
 *       setSomeState(response.data);
 *     },
 *     onReject: response => {
 *       setSomeError(response);
 *     },
 *   },
 *   [fetchSomething]
 * );
 * ```
 *
 * The `onResolve` and `onReject` handlers are registered separately, because
 * the hook will inject a rejection when in case of a canellation. The
 * `cancelPreviousOn` attribute can be used to indicate when the preceding
 * pending promises should be canceled:
 *
 * 'never': No preceding promises will be canceled.
 *
 * 'creation': Any preceding promises will be canceled as soon as a new one is
 * created.
 *
 * 'settlement': Any preceding promise will be canceled when a newer promise is
 * resolved or rejected.
 *
 * 'resolution': Any preceding promise will be canceled when a newer promise is
 * resolved.
 *
 * 'rejection': Any preceding promise will be canceled when a newer promise is
 * rejected.
 *
 * Any pending promises will be canceled when the component using the hook is
 * unmounted, but their status will not be tracked to avoid React warnings
 * about memory leaks.
 *
 * The last argument is a normal React hook dependency list that indicates
 * under which conditions a new reference to the configuration object should be
 * used.
 *
 * The `onResolve`, `onReject` and possible uncatched errors are only triggered
 * if the underlying component is mounted. To ensure they always trigger (i.e.
 * if the promise is called in a `useLayoutEffect`) use the `triggerOrThrow`
 * attribute:
 *
 * 'whenMounted': (default) they are called only if the component is mounted.
 *
 * 'always': they always call. The consumer is then responsible of ensuring no
 * side effects happen if the underlying component is not mounted.
 */
export declare const useTrackedPromise: <Arguments extends unknown[], Result>({ createPromise, onResolve, onReject, cancelPreviousOn, triggerOrThrow, }: UseTrackedPromiseArgs<Arguments, Result>, dependencies: DependencyList) => [PromiseState<Result, unknown>, (...args: Arguments) => Promise<Result>, () => void];
export interface UninitializedPromiseState {
    state: 'uninitialized';
}
export interface PendingPromiseState<ResolvedValue> {
    state: 'pending';
    promise: Promise<ResolvedValue>;
}
export interface ResolvedPromiseState<ResolvedValue> {
    state: 'resolved';
    promise: Promise<ResolvedValue>;
    value: ResolvedValue;
}
export interface RejectedPromiseState<ResolvedValue, RejectedValue> {
    state: 'rejected';
    promise: Promise<ResolvedValue>;
    value: RejectedValue;
}
export type SettledPromiseState<ResolvedValue, RejectedValue> = ResolvedPromiseState<ResolvedValue> | RejectedPromiseState<ResolvedValue, RejectedValue>;
export type PromiseState<ResolvedValue, RejectedValue = unknown> = UninitializedPromiseState | PendingPromiseState<ResolvedValue> | SettledPromiseState<ResolvedValue, RejectedValue>;
export declare const isRejectedPromiseState: <ResolvedValue, RejectedValue>(promiseState: PromiseState<ResolvedValue, RejectedValue>) => promiseState is RejectedPromiseState<ResolvedValue, RejectedValue>;
export declare class CanceledPromiseError extends Error {
    isCanceled: boolean;
    constructor(message?: string);
}
export declare class SilentCanceledPromiseError extends CanceledPromiseError {
}
export {};
