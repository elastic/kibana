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
import { ExpressionFunction } from './expression_functions';
import { ExpressionRenderFunction } from './expression_renderers';
import { Type } from './expression_types';

export interface ExecutorState {
  functions: Record<string, ExpressionFunction>;
  types: Record<string, Type>;
  renderers: Record<string, ExpressionRenderFunction>;
  context: Record<string, unknown>;
}

export const defaultState: ExecutorState = {
  functions: {},
  renderers: {},
  types: {},
  context: {},
};

export interface ExecutorPureTransitions {
  addFunction: (state: ExecutorState) => (fn: ExpressionFunction) => ExecutorState;
  addType: (state: ExecutorState) => (type: Type) => ExecutorState;
  addRenderer: (state: ExecutorState) => (renderer: ExpressionRenderFunction) => ExecutorState;
  extendContext: (state: ExecutorState) => (extraContext: Record<string, unknown>) => ExecutorState;
}

export const pureTransitions: ExecutorPureTransitions = {
  addFunction: state => fn => ({ ...state, functions: { ...state.functions, [fn.name]: fn } }),
  addType: state => type => ({ ...state, types: { ...state.types, [type.name]: type } }),
  addRenderer: state => renderer => ({
    ...state,
    renderers: { ...state.renderers, [renderer.name]: renderer },
  }),
  extendContext: state => extraContext => ({
    ...state,
    context: { ...state.context, ...extraContext },
  }),
};

export interface ExecutorPureSelectors {
  getFunction: (state: ExecutorState) => (id: string) => ExpressionFunction | null;
  getType: (state: ExecutorState) => (id: string) => Type | null;
  getRenderer: (state: ExecutorState) => (id: string) => ExpressionRenderFunction | null;
  getContext: (state: ExecutorState) => () => ExecutorState['context'];
}

export const pureSelectors: ExecutorPureSelectors = {
  getFunction: state => id => state.functions[id] || null,
  getType: state => id => state.types[id] || null,
  getRenderer: state => id => state.renderers[id] || null,
  getContext: ({ context }) => () => context,
};

export type ExecutorContainer = StateContainer<
  ExecutorState,
  ExecutorPureTransitions,
  ExecutorPureSelectors
>;

export const createExecutorContainer = (state: ExecutorState = defaultState): ExecutorContainer => {
  const container = createStateContainer<
    ExecutorState,
    ExecutorPureTransitions,
    ExecutorPureSelectors
  >(state, pureTransitions, pureSelectors);
  return container;
};
