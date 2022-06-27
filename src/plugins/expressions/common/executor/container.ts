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
import { ExpressionFunction } from '../expression_functions';
import { ExpressionType } from '../expression_types';

export interface ExecutorState<Context extends Record<string, unknown> = Record<string, unknown>> {
  functions: Record<string, ExpressionFunction>;
  types: Record<string, ExpressionType>;
  context: Context;
}

export const defaultState: ExecutorState = {
  functions: {},
  types: {},
  context: {},
};

export interface ExecutorPureTransitions {
  addFunction: (state: ExecutorState) => (fn: ExpressionFunction) => ExecutorState;
  addType: (state: ExecutorState) => (type: ExpressionType) => ExecutorState;
}

export const pureTransitions: ExecutorPureTransitions = {
  addFunction: (state) => (fn) => ({ ...state, functions: { ...state.functions, [fn.name]: fn } }),
  addType: (state) => (type) => ({ ...state, types: { ...state.types, [type.name]: type } }),
};

export interface ExecutorPureSelectors {
  getFunction: (state: ExecutorState) => (id: string) => ExpressionFunction | null;
  getType: (state: ExecutorState) => (id: string) => ExpressionType | null;
  getContext: (state: ExecutorState) => () => ExecutorState['context'];
}

export const pureSelectors: ExecutorPureSelectors = {
  getFunction: (state) => (id) => state.functions[id] || null,
  getType: (state) => (id) => state.types[id] || null,
  getContext:
    ({ context }) =>
    () =>
      context,
};

export type ExecutorContainer<Context extends Record<string, unknown> = Record<string, unknown>> =
  StateContainer<ExecutorState<Context>, ExecutorPureTransitions, ExecutorPureSelectors>;

export const createExecutorContainer = <
  Context extends Record<string, unknown> = Record<string, unknown>
>(
  state = defaultState as ExecutorState<Context>
): ExecutorContainer<Context> => {
  const container = createStateContainer<
    ExecutorState<Context>,
    ExecutorPureTransitions,
    ExecutorPureSelectors
  >(state, pureTransitions, pureSelectors);
  return container;
};
