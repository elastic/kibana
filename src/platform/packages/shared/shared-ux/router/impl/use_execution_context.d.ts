import type { SharedUXExecutionContextSetup } from './services';
import type { SharedUXExecutionContext } from './types';
/**
 * Set and clean up application level execution context
 * @param executionContext
 * @param context
 */
export declare function useSharedUXExecutionContext(executionContext: SharedUXExecutionContextSetup | undefined, context: SharedUXExecutionContext): void;
