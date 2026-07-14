export interface RetryableState {
    retryCount: number;
    retryDelay: number;
}
/**
 * HOC wrapping the function with a delay.
 */
export declare const createDelayFn: (state: RetryableState) => <F extends (...args: any) => any>(fn: F) => (() => ReturnType<F>);
