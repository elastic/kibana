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

import { StateContainer } from 'src/plugins/kibana_utils/public';
import { Function, ExpressionRenderFunction } from '../../registries';
import { Type } from '../../type';

export interface ExecutorState {
  functions: Record<string, Function>;
  types: Record<string, Type>;
  renderers: Record<string, ExpressionRenderFunction>;
}

export interface ExecutorPureTransitions {
  addFunction: (state: ExecutorState) => (fn: Function) => ExecutorState;
  addType: (state: ExecutorState) => (type: Type) => ExecutorState;
  addRenderer: (state: ExecutorState) => (renderer: ExpressionRenderFunction) => ExecutorState;
}

export type ExecutorContainer = StateContainer<ExecutorState, ExecutorPureTransitions>;
