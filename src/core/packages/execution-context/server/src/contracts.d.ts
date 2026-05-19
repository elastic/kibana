import type apm from 'elastic-apm-node';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
/**
 * @public
 */
export interface ExecutionContextSetup {
    /**
     * Keeps track of execution context while the passed function is executed.
     * Data are carried over all async operations spawned by the passed function.
     * The nested calls stack the registered context on top of each other.
     **/
    withContext<R>(context: KibanaExecutionContext | undefined, fn: (...args: any[]) => R): R;
    getAsLabels(): apm.Labels;
}
/**
 * @public
 */
export type ExecutionContextStart = ExecutionContextSetup;
