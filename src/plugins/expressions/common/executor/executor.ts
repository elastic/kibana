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

/* eslint-disable max-classes-per-file */

import { ExecutorState, ExecutorContainer } from './container';
import { createExecutorContainer } from './container';
import { AnyExpressionFunctionDefinition, ExpressionFunction } from '../expression_functions';
import {
  ExpressionRenderFunction,
  ExpressionRenderDefinition,
  RenderFunctionsRegistry,
} from './expression_renderers';
import { Execution } from '../execution/execution';
import { IRegistry } from './types';
import { ExpressionType } from '../expression_types/expression_type';
import { AnyExpressionTypeDefinition } from '../expression_types/types';
import { getType } from '../expression_types';
import { ExpressionAstExpression, ExpressionAstNode, parseExpression } from '../parser';

export class TypesRegistry implements IRegistry<ExpressionType> {
  constructor(private readonly executor: Executor) {}

  public register(
    typeDefinition: AnyExpressionTypeDefinition | (() => AnyExpressionTypeDefinition)
  ) {
    this.executor.registerType(typeDefinition);
  }

  public get(id: string): ExpressionType | null {
    return this.executor.state.selectors.getType(id);
  }

  public toJS(): Record<string, ExpressionType> {
    return this.executor.getTypes();
  }

  public toArray(): ExpressionType[] {
    return Object.values(this.toJS());
  }
}

export class FunctionsRegistry implements IRegistry<ExpressionFunction> {
  constructor(private readonly executor: Executor) {}

  public register(
    functionDefinition: AnyExpressionFunctionDefinition | (() => AnyExpressionFunctionDefinition)
  ) {
    this.executor.registerFunction(functionDefinition);
  }

  public get(id: string): ExpressionFunction | null {
    return this.executor.state.selectors.getFunction(id);
  }

  public toJS(): Record<string, ExpressionFunction> {
    return this.executor.getFunctions();
  }

  public toArray(): ExpressionFunction[] {
    return Object.values(this.toJS());
  }
}

export class Executor {
  public readonly state: ExecutorContainer;

  /**
   * @deprecated
   */
  public readonly functions: FunctionsRegistry;

  /**
   * @deprecated
   */
  public readonly types: TypesRegistry;

  public readonly renderers: RenderFunctionsRegistry;

  constructor(state?: ExecutorState) {
    this.state = createExecutorContainer(state);
    this.functions = new FunctionsRegistry(this);
    this.types = new TypesRegistry(this);
    this.renderers = new RenderFunctionsRegistry(this);
  }

  public registerFunction(
    functionDefinition: AnyExpressionFunctionDefinition | (() => AnyExpressionFunctionDefinition)
  ) {
    const fn = new ExpressionFunction(
      typeof functionDefinition === 'object' ? functionDefinition : functionDefinition()
    );
    this.state.transitions.addFunction(fn);
  }

  public getFunctions(): Record<string, ExpressionFunction> {
    return { ...this.state.get().functions };
  }

  public registerType(
    typeDefinition: AnyExpressionTypeDefinition | (() => AnyExpressionTypeDefinition)
  ) {
    const type = new ExpressionType(
      typeof typeDefinition === 'object' ? typeDefinition : typeDefinition()
    );
    this.state.transitions.addType(type);
  }

  public getTypes(): Record<string, ExpressionType> {
    return { ...this.state.get().types };
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

  public extendContext(extraContext: Record<string, unknown>) {
    this.state.transitions.extendContext(extraContext);
  }

  public get context(): Record<string, unknown> {
    return this.state.selectors.getContext();
  }

  public async interpret<T>(ast: ExpressionAstNode, input: T): Promise<unknown> {
    switch (getType(ast)) {
      case 'expression':
        return await this.interpretExpression(ast as ExpressionAstExpression, input);
      case 'string':
      case 'number':
      case 'null':
      case 'boolean':
        return ast;
      default:
        throw new Error(`Unknown AST object: ${JSON.stringify(ast)}`);
    }
  }

  public async interpretExpression<T>(
    ast: string | ExpressionAstExpression,
    input: T
  ): Promise<unknown> {
    const execution = this.createExecution(ast);
    execution.start(input);
    return await execution.result;
  }

  public createExecution(ast: string | ExpressionAstExpression): Execution {
    if (typeof ast === 'string') ast = parseExpression(ast);
    const execution = new Execution({
      ast,
      executor: this,
    });
    return execution;
  }
}
