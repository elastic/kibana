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
import { Execution, ExecutionParams } from '../execution/execution';
import { IRegistry } from '../types';
import { ExpressionType } from '../expression_types/expression_type';
import { AnyExpressionTypeDefinition } from '../expression_types/types';
import { ExpressionAstExpression } from '../ast';
import { typeSpecs } from '../expression_types/specs';
import { functionSpecs } from '../expression_functions/specs';

export interface ExpressionExecOptions {
  /**
   * Whether to execute expression in *debug mode*. In *debug mode* inputs and
   * outputs as well as all resolved arguments and time it took to execute each
   * function are saved and are available for introspection.
   */
  debug?: boolean;
}

export class TypesRegistry implements IRegistry<ExpressionType> {
  constructor(private readonly executor: Executor<any>) {}

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
  constructor(private readonly executor: Executor<any>) {}

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

export class Executor<Context extends Record<string, unknown> = Record<string, unknown>> {
  static createWithDefaults<Ctx extends Record<string, unknown> = Record<string, unknown>>(
    state?: ExecutorState<Ctx>
  ): Executor<Ctx> {
    const executor = new Executor<Ctx>(state);
    for (const type of typeSpecs) executor.registerType(type);
    for (const func of functionSpecs) executor.registerFunction(func);
    return executor;
  }

  public readonly state: ExecutorContainer<Context>;

  /**
   * @deprecated
   */
  public readonly functions: FunctionsRegistry;

  /**
   * @deprecated
   */
  public readonly types: TypesRegistry;

  constructor(state?: ExecutorState<Context>) {
    this.state = createExecutorContainer<Context>(state);
    this.functions = new FunctionsRegistry(this);
    this.types = new TypesRegistry(this);
  }

  public registerFunction(
    functionDefinition: AnyExpressionFunctionDefinition | (() => AnyExpressionFunctionDefinition)
  ) {
    const fn = new ExpressionFunction(
      typeof functionDefinition === 'object' ? functionDefinition : functionDefinition()
    );
    this.state.transitions.addFunction(fn);
  }

  public getFunction(name: string): ExpressionFunction | undefined {
    return this.state.get().functions[name];
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

  public getType(name: string): ExpressionType | undefined {
    return this.state.get().types[name];
  }

  public getTypes(): Record<string, ExpressionType> {
    return { ...this.state.get().types };
  }

  public extendContext(extraContext: Record<string, unknown>) {
    this.state.transitions.extendContext(extraContext);
  }

  public get context(): Record<string, unknown> {
    return this.state.selectors.getContext();
  }

  /**
   * Execute expression and return result.
   *
   * @param ast Expression AST or a string representing expression.
   * @param input Initial input to the first expression function.
   * @param context Extra global context object that will be merged into the
   *    expression global context object that is provided to each function to allow side-effects.
   */
  public async run<
    Input,
    Output,
    ExtraContext extends Record<string, unknown> = Record<string, unknown>
  >(ast: string | ExpressionAstExpression, input: Input, context?: ExtraContext) {
    const execution = this.createExecution(ast, context);
    execution.start(input);
    return (await execution.result) as Output;
  }

  public createExecution<
    ExtraContext extends Record<string, unknown> = Record<string, unknown>,
    Input = unknown,
    Output = unknown
  >(
    ast: string | ExpressionAstExpression,
    context: ExtraContext = {} as ExtraContext,
    { debug }: ExpressionExecOptions = {} as ExpressionExecOptions
  ): Execution<Context & ExtraContext, Input, Output> {
    const params: ExecutionParams<Context & ExtraContext> = {
      executor: this,
      context: {
        ...this.context,
        ...context,
      } as Context & ExtraContext,
      debug,
    };

    if (typeof ast === 'string') params.expression = ast;
    else params.ast = ast;

    const execution = new Execution<Context & ExtraContext, Input, Output>(params);

    return execution;
  }

  public fork(): Executor<Context> {
    const initialState = this.state.get();
    const fork = new Executor<Context>(initialState);

    /**
     * Synchronize registry state - make any new types, functions and context
     * also available in the forked instance of `Executor`.
     */
    this.state.state$.subscribe(({ types, functions, context }) => {
      const state = fork.state.get();
      fork.state.set({
        ...state,
        types: {
          ...types,
          ...state.types,
        },
        functions: {
          ...functions,
          ...state.functions,
        },
        context: {
          ...context,
          ...state.context,
        },
      });
    });

    return fork;
  }
}
