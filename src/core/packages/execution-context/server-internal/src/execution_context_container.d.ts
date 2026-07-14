import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { IExecutionContextContainer } from '@kbn/core-execution-context-server';
export declare const BAGGAGE_HEADER = "x-kbn-context";
export declare function getParentContextFrom(headers: Record<string, string | string[] | undefined>): KibanaExecutionContext | undefined;
export declare const BAGGAGE_MAX_PER_NAME_VALUE_PAIRS = 4096;
export declare class ExecutionContextContainer implements IExecutionContextContainer {
    #private;
    constructor(context: KibanaExecutionContext, parent?: IExecutionContextContainer);
    toString(): string;
    toJSON(): Readonly<KibanaExecutionContext>;
}
