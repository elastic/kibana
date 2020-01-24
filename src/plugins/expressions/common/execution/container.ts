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

import { StateContainer, createStateContainer } from '../../../kibana_utils/public';
import { ExecutorState, defaultState as executorDefaultState } from '../executor';
import { ExpressionAstExpression } from '../parser';
import { ExpressionValue } from '../expression_types';

export interface ExecutionState extends ExecutorState {
  ast: ExpressionAstExpression;
  result?: ExpressionValue;
  error?: Error;
}

const executionDefaultState: ExecutionState = {
  ...executorDefaultState,
  ast: {
    type: 'expression',
    chain: [],
  },
};

// eslint-disable-next-line
export interface ExecutionPureTransitions {}

export const executionPureTransitions: ExecutionPureTransitions = {};

export type ExecutionContainer = StateContainer<ExecutionState, ExecutionPureTransitions>;

export const createExecutionContainer = (
  state: ExecutionState = executionDefaultState
): ExecutionContainer => {
  const container = createStateContainer<ExecutionState, ExecutionPureTransitions>(
    state,
    executionPureTransitions
  );
  return container;
};
