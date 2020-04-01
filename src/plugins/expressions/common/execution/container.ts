/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  StateContainer,
  createStateContainer,
} from '../../../kibana_utils/common/state_containers';
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

// eslint-disable-next-line
export interface ExecutionPureTransitions<Output = ExpressionValue> {
  start: (state: ExecutionState<Output>) => () => ExecutionState<Output>;
  setResult: (state: ExecutionState<Output>) => (result: Output) => ExecutionState<Output>;
  setError: (state: ExecutionState<Output>) => (error: Error) => ExecutionState<Output>;
}

export const executionPureTransitions: ExecutionPureTransitions = {
  start: state => () => ({
    ...state,
    state: 'pending',
  }),
  setResult: state => result => ({
    ...state,
    state: 'result',
    result,
  }),
  setError: state => error => ({
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
