/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  StateContainer,
  createStateContainer,
} from '@kbn/kibana-utils-plugin/common/state_containers';
import { ExecutorState, defaultState as executorDefaultState } from '../executor';
import { ExpressionAstExpression } from '../ast';
import { ExpressionValue } from '../expression_types';

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
