export declare class TimeoutAbortedError extends Error {
    constructor();
}
/**
 * Creates a Promise that resolves after the specified timeout, unless aborted.
 * If the abort signal is triggered (or already aborted), the promise rejects immediately.
 *
 * @param timeout - The timeout duration in milliseconds
 * @param abortSignal - An AbortSignal to cancel the timeout
 * @returns A Promise that resolves after the timeout or rejects if aborted
 * @throws {TimeoutAbortedError} Throws 'Timeout aborted' if the signal is aborted
 */
export declare function abortableTimeout(timeout: number, abortSignal: AbortSignal): Promise<void>;
