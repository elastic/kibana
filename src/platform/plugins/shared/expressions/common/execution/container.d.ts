import type { StateContainer } from '@kbn/kibana-utils-plugin/common/state_containers';
import type { ExecutorState } from '../executor';
import type { ExpressionAstExpression } from '../ast';
import type { ExpressionValue } from '../expression_types';
export interface ExecutionState<Output = ExpressionValue> extends ExecutorState {
    ast: ExpressionAstExpression;
    /**
     * Tracks state of execution.
     *
     * - `not-started` - before .start() method was called.
     * - `pending` - immediately after .start() method is called.
     * - `result` - when expression execution completed.
     * - `error` - when execution failed with error.
     */
    state: 'not-started' | 'pending' | 'result' | 'error';
    /**
     * Result of the expression execution.
     */
    result?: Output;
    /**
     * Error happened during the execution.
     */
    error?: Error;
}
export interface ExecutionPureTransitions<Output = ExpressionValue> {
    start: (state: ExecutionState<Output>) => () => ExecutionState<Output>;
    setResult: (state: ExecutionState<Output>) => (result: Output) => ExecutionState<Output>;
    setError: (state: ExecutionState<Output>) => (error: Error) => ExecutionState<Output>;
}
export declare const executionPureTransitions: ExecutionPureTransitions;
export type ExecutionContainer<Output = ExpressionValue> = StateContainer<ExecutionState<Output>, ExecutionPureTransitions<Output>>;
export declare const createExecutionContainer: <Output = ExpressionValue>(state?: ExecutionState<Output>) => ExecutionContainer<Output>;
