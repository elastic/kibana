/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import { cloneDeep, mapValues } from 'lodash';
import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { SerializableRecord } from '@kbn/utility-types';
import type { SavedObjectReference } from '@kbn/core/types';
import type {
  MigrateFunctionsObject,
  PersistableStateService,
  VersionedState,
} from '@kbn/kibana-utils-plugin/common';
import { migrateToLatest } from '@kbn/kibana-utils-plugin/common';
import type { ExecutorState, ExecutorContainer } from './container';
import { createExecutorContainer } from './container';
import type { AnyExpressionFunctionDefinition } from '../expression_functions';
import { ExpressionFunction } from '../expression_functions';
import type { ExecutionParams, ExecutionResult, FunctionCacheItem } from '../execution/execution';
import { Execution } from '../execution/execution';
import type { IRegistry } from '../types';
import { ExpressionType } from '../expression_types/expression_type';
import type { AnyExpressionTypeDefinition } from '../expression_types/types';
import type { ExpressionAstExpression, ExpressionAstFunction } from '../ast';
import type { ExpressionValueError } from '../expression_types/specs';
// import { typeSpecs } from '../expression_types/specs';
import { ALL_NAMESPACES, getByAlias } from '../util';
import type { ExpressionExecutionParams } from '../service';
import { asyncForEach } from '@kbn/std';

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
    name: string,
    typeDefinition: AnyExpressionTypeDefinition | (() => Promise<AnyExpressionTypeDefinition>)
  ) {
    this.executor.registerType(name, typeDefinition);
  }

  public async get(id: string): Promise<ExpressionType | null> {
    return (await this.executor.getType(id)) ?? null;
  }

  public toJS(): Promise<Record<string, ExpressionType>> {
    return this.executor.getTypes();
  }

  public async toArray(): Promise<ExpressionType[]> {
    return Object.values(await this.toJS());
  }
}

export class FunctionsRegistry implements IRegistry<ExpressionFunction> {
  constructor(private readonly executor: Executor) {}

  public register(
    name: string,
    functionDefinition: AnyExpressionFunctionDefinition | (() => Promise<AnyExpressionFunctionDefinition>)
  ) {
    this.executor.registerFunction(name, functionDefinition);
  }

  public async get(id: string): Promise<ExpressionFunction | null> {
    return await this.executor.getFunction(id) ?? null;
  }

  public toJS(): Promise<Record<string, ExpressionFunction>> {
    return this.executor.getFunctions();
  }

  public async toArray(): Promise<ExpressionFunction[]> {
    return Object.values(await this.toJS());
  }
}

export class Executor<Context extends Record<string, unknown> = Record<string, unknown>>
  implements PersistableStateService<ExpressionAstExpression>
{
  static createWithDefaults<Ctx extends Record<string, unknown> = Record<string, unknown>>(
    logger?: Logger,
    state?: ExecutorState<Ctx>
  ): Executor<Ctx> {
    const executor = new Executor<Ctx>(logger, state);
    // TODO where do we get name from
    // for (const type of typeSpecs) executor.registerType(type);

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

  private functionCache: Map<string, FunctionCacheItem>;

  constructor(
    private readonly logger?: Logger,
    state?: ExecutorState<Context>,
    functionCache: Map<string, FunctionCacheItem> = new Map()
  ) {
    this.functions = new FunctionsRegistry(this as Executor);
    this.types = new TypesRegistry(this as Executor);
    this.container = createExecutorContainer<Context>(state);
    this.functionCache = functionCache;
  }

  public get state(): ExecutorState<Context> {
    return this.container.get();
  }

  public registerFunction(
    name: string,
    functionDefinition: AnyExpressionFunctionDefinition | (() => Promise<AnyExpressionFunctionDefinition>)
  ) {
    this.container.transitions.addFunction(name, async () => {
      return new ExpressionFunction(
        typeof functionDefinition === 'object' ? functionDefinition : await functionDefinition()
      )
    });
  }

  public async getFunction(name: string, namespace?: string): Promise<ExpressionFunction | undefined> {
    const fn = await this.container.get().functions[name]?.();

    if (!fn?.namespace || fn.namespace === namespace) {
      return fn;
    }
  }

  public async getFunctions(namespace?: string): Promise<Record<string, ExpressionFunction>> {
    const fns: Record<string, ExpressionFunction> = {};
    await asyncForEach(Object.keys(this.container.get().functions), async (key) => {
      const fn = await this.container.get().functions[key]();
      if (!fn.namespace || fn.namespace === namespace) {
        fns[key] = fn;
      }
    });
    return fns;
  }

  public registerType(
    name: string,
    typeDefinition: AnyExpressionTypeDefinition | (() => Promise<AnyExpressionTypeDefinition>)
  ) {
    this.container.transitions.addType(name, async () => {
      return new ExpressionType(
        typeof typeDefinition === 'object' ? typeDefinition : await typeDefinition()
      )
    });
  }

  public async getType(name: string): Promise<ExpressionType | undefined> {
    return this.container.get().types[name]?.();
  }

  public async getTypes(): Promise<Record<string, ExpressionType>> {
    const types: Record<string, ExpressionType> = {};
    await asyncForEach(Object.keys(this.container.get().types), async (key) => {
      types[key] = await this.container.get().types[key]();
    });
    return types;
  }

  public get context(): Record<string, unknown> {
    return this.container.selectors.getContext();
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
      functionCache: this.functionCache,
    } as ExecutionParams;

    if (typeof ast === 'string') executionParams.expression = ast;
    else executionParams.ast = ast;

    const execution = new Execution<Input, Output>(
      executionParams,
      this.logger,
      this.functionCache
    );

    return execution;
  }

  private async walkAst(
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
        .map((fn) => {
          const migrations =
            typeof fn.migrations === 'function' ? fn.migrations() : fn.migrations || {};
          return Object.keys(migrations);
        })
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
}
