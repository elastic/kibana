import type { StateContainer } from '@kbn/kibana-utils-plugin/common/state_containers';
import type { ExpressionFunction } from '../expression_functions';
import type { ExpressionType } from '../expression_types';
export interface ExecutorState<Context extends Record<string, unknown> = Record<string, unknown>> {
    functions: Record<string, ExpressionFunction>;
    types: Record<string, ExpressionType>;
    context: Context;
}
export declare const defaultState: ExecutorState;
export interface ExecutorPureTransitions {
    addFunction: (state: ExecutorState) => (fn: ExpressionFunction) => ExecutorState;
    addType: (state: ExecutorState) => (type: ExpressionType) => ExecutorState;
}
export declare const pureTransitions: ExecutorPureTransitions;
export interface ExecutorPureSelectors {
    getFunction: (state: ExecutorState) => (id: string) => ExpressionFunction | null;
    getType: (state: ExecutorState) => (id: string) => ExpressionType | null;
    getContext: (state: ExecutorState) => () => ExecutorState['context'];
}
export declare const pureSelectors: ExecutorPureSelectors;
export type ExecutorContainer<Context extends Record<string, unknown> = Record<string, unknown>> = StateContainer<ExecutorState<Context>, ExecutorPureTransitions, ExecutorPureSelectors>;
export declare const createExecutorContainer: <Context extends Record<string, unknown> = Record<string, unknown>>(state?: ExecutorState<Context>) => ExecutorContainer<Context>;
