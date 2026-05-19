import type { KibanaExecutionContext, CoreStart } from '@kbn/core/public';
/**
 * Set and clean up application level execution context
 * @param executionContext
 * @param context
 */
export declare function useExecutionContext(executionContext: CoreStart['executionContext'] | undefined, context: KibanaExecutionContext): void;
