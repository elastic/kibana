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

import { ExpressionType } from '../expression_types';

/**
 * `ExecutionContext` is an object available to all functions during a single execution;
 * it provides various methods to perform side-effects.
 */
export interface ExecutionContext<Input = unknown> {
  /**
   * Get initial input with which execution started.
   */
  getInitialInput: () => Input;

  /**
   * Same as `getInitialInput`, use `getInitialInput` instead, `getInitialContext` is deprecated.
   *
   * @deprecated
   */
  getInitialContext: () => Input;

  /**
   * Context variables that can be consumed using `var` and `var_set` functions.
   */
  variables: Record<string, unknown>;

  /**
   * A map of available expression types.
   */
  types: Record<string, ExpressionType>;

  /**
   * Adds ability to abort current execution.
   */
  abortSignal?: AbortSignal;

  /**
   * Adapters for `inspector` plugin.
   */
  inspectorAdapters?: unknown;
}
