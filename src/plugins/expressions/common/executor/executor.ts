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
import type { SerializableRecord } from '@kbn/utility-types';
import { ExecutorState, ExecutorContainer } from './container';
import { createExecutorContainer } from './container';
import { AnyExpressionFunctionDefinition, ExpressionFunction } from '../expression_functions';
import { Execution, ExecutionParams, ExecutionResult } from '../execution/execution';
import { IRegistry } from '../types';
import { ExpressionType } from '../expression_types/expression_type';
import { AnyExpressionTypeDefinition } from '../expression_types/types';
import { ExpressionAstExpression, ExpressionAstFunction } from '../ast';
import { ExpressionValueError, typeSpecs } from '../expression_types/specs';
import { ALL_NAMESPACES, getByAlias } from '../util';
import { SavedObjectReference } from '../../../../core/types';
import {
  MigrateFunctionsObject,
  migrateToLatest,
  PersistableStateService,
  VersionedState,
} from '../../../kibana_utils/common';
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
  constructor(private readonly executor: Executor) {}

  public register(
    typeDefinition: AnyExpressionTypeDefinition | (() => AnyExpressionTypeDefinition)
  ) {
    this.executor.registerType(typeDefinition);
  }

  public get(id: string): ExpressionType | null {
    return this.executor.getType(id) ?? null;
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
    return this.executor.getFunction(id) ?? null;
  }

  public toJS(): Record<string, ExpressionFunction> {
    return this.executor.getFunctions();
  }

  public toArray(): ExpressionFunction[] {
    return Object.values(this.toJS());
  }
}

export class Executor<Context extends Record<string, unknown> = Record<string, unknown>>
  implements PersistableStateService<ExpressionAstExpression>
{
  static createWithDefaults<Ctx extends Record<string, unknown> = Record<string, unknown>>(
    state?: ExecutorState<Ctx>
  ): Executor<Ctx> {
    const executor = new Executor<Ctx>(state);
    for (const type of typeSpecs) executor.registerType(type);

    return executor;
  }

  public readonly container: ExecutorContainer<Context>;

  /**
   * @deprecated
   */
  public readonly functions: FunctionsRegistry;

  /**
   * @deprecated
   */
  public readonly types: TypesRegistry;

  protected parent?: Executor<Context>;

  constructor(state?: ExecutorState<Context>) {
    this.functions = new FunctionsRegistry(this as Executor);
    this.types = new TypesRegistry(this as Executor);
    this.container = createExecutorContainer<Context>(state);
  }

  public get state(): ExecutorState<Context> {
    const parent = this.parent?.state;
    const state = this.container.get();

    return {
      ...(parent ?? {}),
      ...state,
      types: {
        ...(parent?.types ?? {}),
        ...state.types,
      },
      functions: {
        ...(parent?.functions ?? {}),
        ...state.functions,
      },
      context: {
        ...(parent?.context ?? {}),
        ...state.context,
      },
    };
  }

  public registerFunction(
    functionDefinition: AnyExpressionFunctionDefinition | (() => AnyExpressionFunctionDefinition)
  ) {
    const fn = new ExpressionFunction(
      typeof functionDefinition === 'object' ? functionDefinition : functionDefinition()
    );
    this.container.transitions.addFunction(fn);
  }

  public getFunction(name: string, namespace?: string): ExpressionFunction | undefined {
    const fn = this.container.get().functions[name];
    if (!fn?.namespace || fn.namespace === namespace) return fn;
  }

  public getFunctions(namespace?: string): Record<string, ExpressionFunction> {
    const fns = Object.entries(this.container.get().functions);
    const filtered = fns.filter(
      ([key, value]) => !value.namespace || value.namespace === namespace
    );
    return Object.fromEntries(filtered);
  }

  public registerType(
    typeDefinition: AnyExpressionTypeDefinition | (() => AnyExpressionTypeDefinition)
  ) {
    const type = new ExpressionType(
      typeof typeDefinition === 'object' ? typeDefinition : typeDefinition()
    );

    this.container.transitions.addType(type);
  }

  public getType(name: string): ExpressionType | undefined {
    return this.container.get().types[name] ?? this.parent?.getType(name);
  }

  public getTypes(): Record<string, ExpressionType> {
    return {
      ...(this.parent?.getTypes() ?? {}),
      ...this.container.get().types,
    };
  }

  public get context(): Record<string, unknown> {
    return {
      ...(this.parent?.context ?? {}),
      ...this.container.selectors.getContext(),
    };
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
    const executionParams = {
      params,
      executor: this,
    } as ExecutionParams;

    if (typeof ast === 'string') executionParams.expression = ast;
    else executionParams.ast = ast;

    const execution = new Execution<Input, Output>(executionParams);

    return execution;
  }

  private walkAst(
    ast: ExpressionAstExpression,
    action: (fn: ExpressionFunction, link: ExpressionAstFunction) => void
  ) {
    const functions = this.container.get().functions;
    for (const link of ast.chain) {
      const { function: fnName, arguments: fnArgs } = link;
      const fn = getByAlias(functions, fnName, ALL_NAMESPACES);

      if (fn) {
        // if any of arguments are expressions we should migrate those first
        link.arguments = mapValues(fnArgs, (asts) =>
          asts.map((arg) =>
            arg != null && typeof arg === 'object' ? this.walkAst(arg, action) : arg
          )
        );

        action(fn, link);
      }
    }

    return ast;
  }

  private walkAstAndTransform(
    ast: ExpressionAstExpression,
    transform: (
      fn: ExpressionFunction,
      ast: ExpressionAstFunction
    ) => ExpressionAstFunction | ExpressionAstExpression
  ): ExpressionAstExpression {
    let additionalFunctions = 0;
    const functions = this.container.get().functions;
    return (
      ast.chain.reduce<ExpressionAstExpression>(
        (newAst: ExpressionAstExpression, funcAst: ExpressionAstFunction, index: number) => {
          const realIndex = index + additionalFunctions;
          const { function: fnName, arguments: fnArgs } = funcAst;
          const fn = getByAlias(functions, fnName, ALL_NAMESPACES);
          if (!fn) {
            return newAst;
          }

          // if any of arguments are expressions we should migrate those first
          funcAst.arguments = mapValues(fnArgs, (asts) =>
            asts.map((arg) =>
              arg != null && typeof arg === 'object'
                ? this.walkAstAndTransform(arg, transform)
                : arg
            )
          );

          const transformedFn = transform(fn, funcAst);
          if (transformedFn.type === 'function') {
            const prevChain = realIndex > 0 ? newAst.chain.slice(0, realIndex) : [];
            const nextChain = newAst.chain.slice(realIndex + 1);
            return {
              ...newAst,
              chain: [...prevChain, transformedFn, ...nextChain],
            };
          }

          if (transformedFn.type === 'expression') {
            const { chain } = transformedFn;
            const prevChain = realIndex > 0 ? newAst.chain.slice(0, realIndex) : [];
            const nextChain = newAst.chain.slice(realIndex + 1);
            additionalFunctions += chain.length - 1;
            return {
              ...newAst,
              chain: [...prevChain, ...chain, ...nextChain],
            };
          }

          return newAst;
        },
        ast
      ) ?? ast
    );
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
      allReferences.push(...references.map((r) => ({ ...r, name: `l${linkId}_${r.name}` })));
      linkId = linkId + 1;
    });
    return { state: newAst, references: allReferences };
  }

  public telemetry(ast: ExpressionAstExpression, telemetryData: Record<string, unknown>) {
    this.walkAst(cloneDeep(ast), (fn, link) => {
      telemetryData = fn.telemetry(link.arguments, telemetryData);
    });

    return telemetryData;
  }

  public getAllMigrations() {
    const uniqueVersions = new Set(
      Object.values(this.container.get().functions)
        .map((fn) => Object.keys(fn.migrations))
        .flat(1)
    );

    const migrations: MigrateFunctionsObject = {};
    uniqueVersions.forEach((version) => {
      migrations[version] = (state) => ({
        ...this.migrate(state, version),
      });
    });

    return migrations;
  }

  public migrateToLatest(state: VersionedState) {
    return migrateToLatest(this.getAllMigrations(), state) as ExpressionAstExpression;
  }

  private migrate(ast: SerializableRecord, version: string) {
    return this.walkAstAndTransform(cloneDeep(ast) as ExpressionAstExpression, (fn, link) => {
      const migrations =
        typeof fn.migrations === 'function' ? fn.migrations() : fn.migrations || {};
      if (!migrations[version]) {
        return link;
      }

      return migrations[version](link) as ExpressionAstExpression;
    });
  }

  public fork(): Executor<Context> {
    const fork = new Executor<Context>();
    fork.parent = this;

    return fork;
  }
}
