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

import { ExecutorState, ExecutorContainer } from './state/types';
import { createExecutorContainer } from './state/container';
import { Function, ExpressionRenderDefinition, ExpressionRenderFunction } from '../registries';
import { AnyExpressionFunction, AnyExpressionType } from '../types';
import { Type } from '../type';

export class Executor {
  public readonly container: ExecutorContainer;

  constructor(state?: ExecutorState) {
    this.container = createExecutorContainer(state);
  }

  registerType = (typeDefinition: AnyExpressionType | (() => AnyExpressionType)) => {
    const type = new Type(typeof typeDefinition === 'object' ? typeDefinition : typeDefinition());
    this.container.transitions.addType(type);
  };

  registerFunction = (definition: AnyExpressionFunction | (() => AnyExpressionFunction)) => {
    const fn = new Function(typeof definition === 'object' ? definition : definition());
    this.container.transitions.addFunction(fn);
  };

  registerRenderer = (
    definition: ExpressionRenderDefinition | (() => ExpressionRenderDefinition)
  ) => {
    const renderer = new ExpressionRenderFunction(
      typeof definition === 'object' ? definition : definition()
    );
    this.container.transitions.addRenderer(renderer);
  };
}
