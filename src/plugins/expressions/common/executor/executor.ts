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

import { ExecutorState, ExecutorContainer } from './container';
import { createExecutorContainer } from './container';
import { FunctionsRegistry, ExpressionFunction } from './expression_functions';
import { TypesRegistry, Type, getType } from './expression_types';
import { AnyExpressionFunction, AnyExpressionType, ExpressionAST } from '../types';
import {
  ExpressionRenderFunction,
  ExpressionRenderDefinition,
  RenderFunctionsRegistry,
} from './expression_renderers';
import { Execution } from '../execution/execution';

export class Executor {
  public readonly state: ExecutorContainer;
  public readonly functions: FunctionsRegistry;
  public readonly types: TypesRegistry;
  public readonly renderers: RenderFunctionsRegistry;

  constructor(state?: ExecutorState) {
    this.state = createExecutorContainer(state);
    this.functions = new FunctionsRegistry(this);
    this.types = new TypesRegistry(this);
    this.renderers = new RenderFunctionsRegistry(this);
  }

  public registerFunction(
    functionDefinition: AnyExpressionFunction | (() => AnyExpressionFunction)
  ) {
    const fn = new ExpressionFunction(
      typeof functionDefinition === 'object' ? functionDefinition : functionDefinition()
    );
    this.state.transitions.addFunction(fn);
  }

  public getFunctions(): Record<string, undefined | ExpressionFunction> {
    return { ...this.state.get().functions };
  }

  public registerType(typeDefinition: AnyExpressionType | (() => AnyExpressionType)) {
    const type = new Type(typeof typeDefinition === 'object' ? typeDefinition : typeDefinition());
    this.state.transitions.addType(type);
  }

  public getTypes(): Record<string, undefined | Type> {
    return { ...(this.state.get().types as Record<string, undefined | Type>) };
  }

  public registerRenderer(
    definition: ExpressionRenderDefinition | (() => ExpressionRenderDefinition)
  ) {
    const renderFunction = new ExpressionRenderFunction(
      typeof definition === 'object' ? definition : definition()
    );
    this.state.transitions.addRenderer(renderFunction);
  }

  public getRenderers(): Record<string, undefined | ExpressionRenderFunction> {
    return { ...this.state.get().renderers };
  }

  public executeExpression<T>(ast: ExpressionAST, input: T): Execution {
    const execution = new Execution(this, ast);
    return execution;
  }

  public interpret<T>(ast: ExpressionAST, input: T) {
    // const handlers = { ...config.handlers, types };
    const type = getType(ast);
    switch (type) {
      case 'expression':
        return this.executeExpression<T>(ast, input);
      case 'string':
      case 'number':
      case 'null':
      case 'boolean':
        return ast;
      default:
        throw new Error(`Unknown AST object: ${JSON.stringify(ast)}`);
    }
  }
}
