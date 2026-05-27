import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
export interface HasExecutionContext {
    executionContext: KibanaExecutionContext;
}
export declare const apiHasExecutionContext: (unknownApi: null | unknown) => unknownApi is HasExecutionContext;
