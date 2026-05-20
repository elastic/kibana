import type { ESQLCallbacks } from '@kbn/esql-types';
/**
 * Wraps each function in an ESQLCallbacks object with timing instrumentation.
 *
 * Parallel callbacks are not double-counted: only time where at
 * least one callback is being executed is accumulated.
 *
 * Returns the wrapped callbacks and a getter for the total time
 * spent inside callback invocations.
 */
export declare const createTimedCallbacks: (callbacks: ESQLCallbacks) => {
    callbacks: ESQLCallbacks;
    getCallbacksDuration: () => number;
};
