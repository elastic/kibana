/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createStateContainer } from '../../../kibana_utils/common/state_containers/create_state_container';
import type { StateContainer } from '../../../kibana_utils/common/state_containers/types';
import type { ExpressionAstExpression } from '../ast/types';
import type { ExecutorState } from '../executor/container';
import { defaultState as executorDefaultState } from '../executor/container';
import type { ExpressionValue } from '../expression_types/types';

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

const executionDefaultState: ExecutionState = {
  ...executorDefaultState,
  state: 'not-started',
  ast: {
    type: 'expression',
    chain: [],
  },
};

export interface ExecutionPureTransitions<Output = ExpressionValue> {
  start: (state: ExecutionState<Output>) => () => ExecutionState<Output>;
  setResult: (state: ExecutionState<Output>) => (result: Output) => ExecutionState<Output>;
  setError: (state: ExecutionState<Output>) => (error: Error) => ExecutionState<Output>;
}

export const executionPureTransitions: ExecutionPureTransitions = {
  start: (state) => () => ({
    ...state,
    state: 'pending',
  }),
  setResult: (state) => (result) => ({
    ...state,
    state: 'result',
    result,
  }),
  setError: (state) => (error) => ({
    ...state,
    state: 'error',
    error,
  }),
};

export type ExecutionContainer<Output = ExpressionValue> = StateContainer<
  ExecutionState<Output>,
  ExecutionPureTransitions<Output>
>;

const freeze = <T>(state: T): T => state;

export const createExecutionContainer = <Output = ExpressionValue>(
  state: ExecutionState<Output> = executionDefaultState
): ExecutionContainer<Output> => {
  const container = createStateContainer<
    ExecutionState<Output>,
    ExecutionPureTransitions<Output>,
    object
  >(
    state,
    executionPureTransitions,
    {},
    {
      freeze,
    }
  );
  return container;
};
