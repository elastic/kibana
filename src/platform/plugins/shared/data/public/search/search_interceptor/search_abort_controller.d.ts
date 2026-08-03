import { AbortReason } from '@kbn/kibana-utils-plugin/common';
export declare class SearchAbortController {
    private inputAbortSignals;
    private abortController;
    private timeoutSub?;
    private destroyed;
    constructor(timeout?: number);
    private abortHandler;
    cleanup(): void;
    addAbortSignal(inputSignal: AbortSignal): void;
    getSignal(): AbortSignal;
    abort(reason?: AbortReason): void;
    isTimeout(): boolean;
    isCanceled(): boolean;
}
