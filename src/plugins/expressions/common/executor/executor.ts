/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import { cloneDeep, mapValues } from 'lodash';
import { Observable } from 'rxjs';
import { ExecutorState, ExecutorContainer } from './container';
import { createExecutorContainer } from './container';
import { AnyExpressionFunctionDefinition, ExpressionFunction } from '../expression_functions';
import { Execution, ExecutionParams, ExecutionResult } from '../execution/execution';
import { IRegistry } from '../types';
import { ExpressionType } from '../expression_types/expression_type';
import { AnyExpressionTypeDefinition } from '../expression_types/types';
import { ExpressionAstExpression, ExpressionAstFunction } from '../ast';
import { ExpressionValueError, typeSpecs } from '../expression_types/specs';
import { getByAlias } from '../util';
import { SavedObjectReference } from '../../../../core/types';
import { PersistableStateService, SerializableState } from '../../../kibana_utils/common';
import { ExpressionExecutionParams } from '../service';

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

export class Executor<Context extends Record<string, unknown> = Record<string, unknown>>
  implements PersistableStateService<ExpressionAstExpression> {
  static createWithDefaults<Ctx extends Record<string, unknown> = Record<string, unknown>>(
    state?: ExecutorState<Ctx>
  ): Executor<Ctx> {
    const executor = new Executor<Ctx>(state);
    for (const type of typeSpecs) executor.registerType(type);

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
  public run<Input, Output>(
    ast: string | ExpressionAstExpression,
    input: Input,
    params: ExpressionExecutionParams = {}
  ): Observable<ExecutionResult<Output | ExpressionValueError>> {
    return this.createExecution<Input, Output>(ast, params).start(input);
  }

  public createExecution<Input = unknown, Output = unknown>(
    ast: string | ExpressionAstExpression,
    params: ExpressionExecutionParams = {}
  ): Execution<Input, Output> {
    const executionParams: ExecutionParams = {
      executor: this,
      params: {
        ...params,
        // for canvas we are passing this in,
        // canvas should be refactored to not pass any extra context in
        extraContext: this.context,
      } as any,
    };

    if (typeof ast === 'string') executionParams.expression = ast;
    else executionParams.ast = ast;

    const execution = new Execution<Input, Output>(executionParams);

    return execution;
  }

  private walkAst(
    ast: ExpressionAstExpression,
    action: (fn: ExpressionFunction, link: ExpressionAstFunction) => void
  ) {
    for (const link of ast.chain) {
      const { function: fnName, arguments: fnArgs } = link;
      const fn = getByAlias(this.state.get().functions, fnName);

      if (fn) {
        // if any of arguments are expressions we should migrate those first
        link.arguments = mapValues(fnArgs, (asts, argName) => {
          return asts.map((arg) => {
            if (typeof arg === 'object') {
              return this.walkAst(arg, action);
            }
            return arg;
          });
        });

        action(fn, link);
      }
    }

    return ast;
  }

  public inject(ast: ExpressionAstExpression, references: SavedObjectReference[]) {
    let linkId = 0;
    return this.walkAst(cloneDeep(ast), (fn, link) => {
      link.arguments = fn.inject(
        link.arguments,
        references
          .filter((r) => r.name.includes(`l${linkId}_`))
          .map((r) => ({ ...r, name: r.name.replace(`l${linkId}_`, '') }))
      );
      linkId++;
    });
  }

  public extract(ast: ExpressionAstExpression) {
    let linkId = 0;
    const allReferences: SavedObjectReference[] = [];
    const newAst = this.walkAst(cloneDeep(ast), (fn, link) => {
      const { state, references } = fn.extract(link.arguments);
      link.arguments = state;
      allReferences.push(...references.map((r) => ({ ...r, name: `l${linkId++}_${r.name}` })));
    });
    return { state: newAst, references: allReferences };
  }

  public telemetry(ast: ExpressionAstExpression, telemetryData: Record<string, any>) {
    this.walkAst(cloneDeep(ast), (fn, link) => {
      telemetryData = fn.telemetry(link.arguments, telemetryData);
    });

    return telemetryData;
  }

  public migrate(ast: SerializableState, version: string) {
    return this.walkAst(cloneDeep(ast) as ExpressionAstExpression, (fn, link) => {
      if (!fn.migrations[version]) return link;
      const updatedAst = fn.migrations[version](link) as ExpressionAstFunction;
      link.arguments = updatedAst.arguments;
      link.type = updatedAst.type;
    });
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
