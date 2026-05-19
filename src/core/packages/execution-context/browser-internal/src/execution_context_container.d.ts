import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
export declare const BAGGAGE_MAX_PER_NAME_VALUE_PAIRS = 4096;
/**
 * @public
 */
export interface IExecutionContextContainer {
    toHeader: () => Record<string, string>;
    toJSON: () => Readonly<KibanaExecutionContext>;
}
export declare class ExecutionContextContainer implements IExecutionContextContainer {
    #private;
    constructor(context: Readonly<KibanaExecutionContext>);
    private toString;
    toHeader(): {
        "x-kbn-context": string;
    };
    toJSON(): Readonly<KibanaExecutionContext>;
}
