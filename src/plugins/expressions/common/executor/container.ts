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
} from '../../../kibana_utils/common/state_containers';
import { ExpressionFunction } from '../expression_functions';
import { ExpressionType } from '../expression_types';

export interface ExecutorState<Context extends Record<string, unknown> = Record<string, unknown>> {
  functions: Record<string, ExpressionFunction>;
  types: Record<string, ExpressionType>;
  context: Context;
}

export const defaultState: ExecutorState<any> = {
  functions: {},
  types: {},
  context: {},
};

export interface ExecutorPureTransitions {
  addFunction: (state: ExecutorState) => (fn: ExpressionFunction) => ExecutorState;
  addFunctions: (state: ExecutorState) => (fns: ExpressionFunction[]) => ExecutorState;
  removeFunction: (state: ExecutorState) => (fnName: ExpressionFunction['name']) => ExecutorState;
  removeFunctions: (
    state: ExecutorState
  ) => (fnNames: Array<ExpressionFunction['name']>) => ExecutorState;
  addType: (state: ExecutorState) => (type: ExpressionType) => ExecutorState;
  addTypes: (state: ExecutorState) => (types: ExpressionType[]) => ExecutorState;
  removeType: (state: ExecutorState) => (typeName: ExpressionType['name']) => ExecutorState;
  removeTypes: (state: ExecutorState) => (typeName: Array<ExpressionType['name']>) => ExecutorState;
  extendContext: (state: ExecutorState) => (extraContext: Record<string, unknown>) => ExecutorState;
}

const addFunctions: ExecutorPureTransitions['addFunctions'] = (state) => (fns) => {
  const functions = {} as Record<string, ExpressionFunction>;

  fns.forEach((fn) => {
    functions[fn.name] = fn;
  });

  return {
    ...state,
    functions: {
      ...state.functions,
      ...functions,
    },
  };
};

const removeFunctions: ExecutorPureTransitions['removeFunctions'] = (state) => (names) => {
  const functions = {} as Record<string, ExpressionFunction>;

  for (const name in state.functions) {
    if (!names.includes(name)) {
      functions[name] = state.functions[name];
    }
  }

  return {
    ...state,
    functions,
  };
};

const addTypes: ExecutorPureTransitions['addTypes'] = (state) => (typesToAdd) => {
  const types = {} as Record<string, ExpressionType>;

  typesToAdd.forEach((type) => {
    types[type.name] = type;
  });

  return {
    ...state,
    types: {
      ...state.types,
      ...types,
    },
  };
};

const removeTypes: ExecutorPureTransitions['removeTypes'] = (state) => (typesToRemove) => {
  const types = {} as Record<string, ExpressionType>;

  for (const name in state.types) {
    if (!typesToRemove.includes(name)) {
      types[name] = state.types[name];
    }
  }

  return {
    ...state,
    types,
  };
};

export const pureTransitions: ExecutorPureTransitions = {
  addFunction: (state) => (fn) => addFunctions(state)([fn]),
  addFunctions,
  removeFunction: (state) => (fnName) => removeFunctions(state)([fnName]),
  removeFunctions,
  addType: (state) => (type) => addTypes(state)([type]),
  addTypes,
  removeType: (state) => (typeName) => removeTypes(state)([typeName]),
  removeTypes,
  extendContext: (state) => (extraContext) => ({
    ...state,
    context: { ...state.context, ...extraContext },
  }),
};

export interface ExecutorPureSelectors {
  getFunction: (state: ExecutorState) => (id: string) => ExpressionFunction | null;
  getType: (state: ExecutorState) => (id: string) => ExpressionType | null;
  getContext: (state: ExecutorState) => () => ExecutorState['context'];
}

export const pureSelectors: ExecutorPureSelectors = {
  getFunction: (state) => (id) => state.functions[id] || null,
  getType: (state) => (id) => state.types[id] || null,
  getContext: ({ context }) => () => context,
};

export type ExecutorContainer<
  Context extends Record<string, unknown> = Record<string, unknown>
> = StateContainer<ExecutorState<Context>, ExecutorPureTransitions, ExecutorPureSelectors>;

export const createExecutorContainer = <
  Context extends Record<string, unknown> = Record<string, unknown>
>(
  state: ExecutorState<Context> = defaultState
): ExecutorContainer<Context> => {
  const container = createStateContainer<
    ExecutorState<Context>,
    ExecutorPureTransitions,
    ExecutorPureSelectors
  >(state, pureTransitions, pureSelectors);
  return container;
};
