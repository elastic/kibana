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

import { ExpressionInterpret } from '../interpreter_provider';
import { TimeRange, Query, esFilters } from '../../../data/public';
import { Adapters } from '../../../inspector/public';
import { ExpressionRenderDefinition } from '../registries';

export type ExpressionInterpretWithHandlers = (
  ast: Parameters<ExpressionInterpret>[0],
  context: Parameters<ExpressionInterpret>[1],
  handlers: IInterpreterHandlers
) => ReturnType<ExpressionInterpret>;

export interface ExpressionInterpreter {
  interpretAst: ExpressionInterpretWithHandlers;
}

export interface ExpressionExecutor {
  interpreter: ExpressionInterpreter;
}

export type RenderId = number;
export type Data = any;
export type event = any;
export type Context = object;

export interface SearchContext {
  type: 'kibana_context';
  filters?: esFilters.Filter[];
  query?: Query;
  timeRange?: TimeRange;
}

export type IGetInitialContext = () => SearchContext | Context;

export interface IExpressionLoaderParams {
  searchContext?: SearchContext;
  context?: Context;
  variables?: Record<string, any>;
  disableCaching?: boolean;
  customFunctions?: [];
  customRenderers?: [];
  extraHandlers?: Record<string, any>;
  inspectorAdapters?: Adapters;
  onRenderError?: RenderErrorHandlerFnType;
}

export interface IInterpreterHandlers {
  getInitialContext: IGetInitialContext;
  inspectorAdapters?: Adapters;
  abortSignal?: AbortSignal;
}

export interface IInterpreterRenderHandlers {
  /**
   * Done increments the number of rendering successes
   */
  done: () => void;
  onDestroy: (fn: () => void) => void;
  reload: () => void;
  update: (params: any) => void;
  event: (event: event) => void;
}

export interface IInterpreterRenderFunction<T = unknown> {
  name: string;
  displayName: string;
  help: string;
  validate: () => void;
  reuseDomNode: boolean;
  render: (domNode: Element, data: T, handlers: IInterpreterRenderHandlers) => void | Promise<void>;
}

export interface IInterpreterErrorResult {
  type: 'error';
  error: { message: string; name: string; stack: string };
}

export interface IInterpreterSuccessResult {
  type: string;
  as?: string;
  value?: unknown;
  error?: unknown;
}

export type IInterpreterResult = IInterpreterSuccessResult & IInterpreterErrorResult;

export { ExpressionRenderDefinition };

export interface RenderError extends Error {
  type?: string;
}

export type RenderErrorHandlerFnType = (
  domNode: HTMLElement,
  error: RenderError,
  handlers: IInterpreterRenderHandlers
) => void;
