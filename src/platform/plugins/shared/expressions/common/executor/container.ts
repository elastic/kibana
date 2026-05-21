/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateContainer } from '@kbn/kibana-utils-plugin/common/state_containers';
import { createStateContainer } from '@kbn/kibana-utils-plugin/common/state_containers';
import type { ExpressionFunction } from '../expression_functions';
import type { ExpressionType } from '../expression_types';

export interface ExecutorState<Context extends Record<string, unknown> = Record<string, unknown>> {
  functions: Record<string, () => Promise<ExpressionFunction>>;
  types: Record<string, () => Promise<ExpressionType>>;
  context: Context;
}

export const defaultState: ExecutorState = {
  functions: {},
  types: {},
  context: {},
};

export interface ExecutorPureTransitions {
  addFunction: (state: ExecutorState) => (name: string, getFn: () => Promise<ExpressionFunction>) => ExecutorState;
  addType: (state: ExecutorState) => (name: string, getType: () => Promise<ExpressionType>) => ExecutorState;
}

export const pureTransitions: ExecutorPureTransitions = {
  addFunction: (state) => (name, getFn) => ({ ...state, functions: { ...state.functions, [name]: getFn } }),
  addType: (state) => (name, getType) => ({ ...state, types: { ...state.types, [name]: getType } }),
};

export interface ExecutorPureSelectors {
  getFunction: (state: ExecutorState) => (id: string) => Promise<ExpressionFunction | null>;
  getType: (state: ExecutorState) => (id: string) => Promise<ExpressionType | null>;
  getContext: (state: ExecutorState) => () => ExecutorState['context'];
}

export const pureSelectors: ExecutorPureSelectors = {
  getFunction: (state) => async (id) => state.functions[id]?.() || null,
  getType: (state) => (id) => state.types[id]?.() || null,
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
