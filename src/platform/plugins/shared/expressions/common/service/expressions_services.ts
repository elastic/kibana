/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { KibanaExecutionContext } from '@kbn/core/public';

import { SavedObjectReference } from '@kbn/core/types';
import {
  MigrateFunctionsObject,
  PersistableStateService,
  VersionedState,
} from '@kbn/kibana-utils-plugin/common';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { ExecutionContextSearch } from '@kbn/es-query';
import { Executor } from '../executor';
import { AnyExpressionRenderDefinition, ExpressionRendererRegistry } from '../expression_renderers';
import { ExpressionAstExpression } from '../ast';
import { ExecutionContract, ExecutionResult } from '../execution';
import { AnyExpressionTypeDefinition, ExpressionValueError } from '../expression_types';
import { AnyExpressionFunctionDefinition } from '../expression_functions';
import {
  clog,
  createTable,
  font,
  variableSet,
  variable,
  theme,
  cumulativeSum,
  derivative,
  movingAverage,
  mapColumn,
  overallMetric,
  math,
  mathColumn,
} from '../expression_functions';
import { ExpressionsServiceFork } from './expressions_fork';

/**
 * The public contract that `ExpressionsService` provides to other plugins
 * in Kibana Platform in *setup* life-cycle.
 */
export interface ExpressionsServiceSetup {
  /**
   * Get a registered `ExpressionFunction` by its name, which was registered
   * using the `registerFunction` method. The returned `ExpressionFunction`
   * instance is an internal representation of the function in Expressions
   * service - do not mutate that object.
   * @deprecated Use start contract instead.
   */
  getFunction(name: string, namespace?: string): ReturnType<Executor['getFunction']>;

  /**
   * Returns POJO map of all registered expression functions, where keys are
   * names of the functions and values are `ExpressionFunction` instances.
   * @deprecated Use start contract instead.
   */
  getFunctions(namespace?: string): ReturnType<Executor['getFunctions']>;

  /**
   * Returns POJO map of all registered expression types, where keys are
   * names of the types and values are `ExpressionType` instances.
   * @deprecated Use start contract instead.
   */
  getTypes(): ReturnType<Executor['getTypes']>;

  /**
   * Create a new instance of `ExpressionsService`. The new instance inherits
   * all state of the original `ExpressionsService`, including all expression
   * types, expression functions and context. Also, all new types and functions
   * registered in the original services AFTER the forking event will be
   * available in the forked instance. However, all new types and functions
   * registered in the forked instances will NOT be available to the original
   * service.
   * @param name A fork name that can be used to get fork instance later.
   */
  fork(namespace: string): ExpressionsServiceFork;

  /**
   * Register an expression function, which will be possible to execute as
   * part of the expression pipeline.
   *
   * Below we register a function which simply sleeps for given number of
   * milliseconds to delay the execution and outputs its input as-is.
   *
   * ```ts
   * expressions.registerFunction({
   *   name: 'sleep',
   *   args: {
   *     time: {
   *       aliases: ['_'],
   *       help: 'Time in milliseconds for how long to sleep',
   *       types: ['number'],
   *     },
   *   },
   *   help: '',
   *   fn: async (input, args, context) => {
   *     await new Promise(r => setTimeout(r, args.time));
   *     return input;
   *   },
   * }
   * ```
   *
   * The actual function is defined in the `fn` key. The function can be *async*.
   * It receives three arguments: (1) `input` is the output of the previous function
   * or the initial input of the expression if the function is first in chain;
   * (2) `args` are function arguments as defined in expression string, that can
   * be edited by user (e.g in case of Canvas); (3) `context` is a shared object
   * passed to all functions that can be used for side-effects.
   */
  registerFunction(
    functionDefinition: AnyExpressionFunctionDefinition | (() => AnyExpressionFunctionDefinition)
  ): void;

  registerType(
    typeDefinition: AnyExpressionTypeDefinition | (() => AnyExpressionTypeDefinition)
  ): void;

  registerRenderer(
    definition: AnyExpressionRenderDefinition | (() => AnyExpressionRenderDefinition)
  ): void;

  getAllMigrations(): MigrateFunctionsObject;
}

export interface ExpressionExecutionParams {
  searchContext?: ExecutionContextSearch;

  variables?: Record<string, unknown>;

  /**
   * Whether to execute expression in *debug mode*. In *debug mode* inputs and
   * outputs as well as all resolved arguments and time it took to execute each
   * function are saved and are available for introspection.
   */
  debug?: boolean;

  /**
   * Makes a `KibanaRequest` object available to expression functions. Useful for
   * functions which are running on the server and need to perform operations that
   * are scoped to a specific user.
   */
  kibanaRequest?: KibanaRequest;

  searchSessionId?: string;

  syncColors?: boolean;

  syncCursor?: boolean;

  syncTooltips?: boolean;

  inspectorAdapters?: Adapters;

  executionContext?: KibanaExecutionContext;

  namespace?: string;

  /**
   * Toggles the partial results support.
   * @default false
   */
  partial?: boolean;

  /**
   * Throttling of partial results in milliseconds. 0 is disabling the throttling.
   * @deafult 0
   */
  throttle?: number;

  allowCache?: boolean;
}

/**
 * The public contract that `ExpressionsService` provides to other plugins
 * in Kibana Platform in *start* life-cycle.
 */
export interface ExpressionsServiceStart {
  /**
   * Get a registered `ExpressionFunction` by its name, which was registered
   * using the `registerFunction` method. The returned `ExpressionFunction`
   * instance is an internal representation of the function in Expressions
   * service - do not mutate that object.
   */
  getFunction(name: string, namespace?: string): ReturnType<Executor['getFunction']>;

  /**
   * Returns POJO map of all registered expression functions, where keys are
   * names of the functions and values are `ExpressionFunction` instances.
   */
  getFunctions(namespace?: string): ReturnType<Executor['getFunctions']>;

  /**
   * Get a registered `ExpressionRenderer` by its name, which was registered
   * using the `registerRenderer` method. The returned `ExpressionRenderer`
   * instance is an internal representation of the renderer in Expressions
   * service - do not mutate that object.
   */
  getRenderer(name: string): ReturnType<ExpressionRendererRegistry['get']>;

  /**
   * Returns POJO map of all registered expression renderers, where keys are
   * names of the renderers and values are `ExpressionRenderer` instances.
   */
  getRenderers(): ReturnType<ExpressionRendererRegistry['toJS']>;

  /**
   * Get a registered `ExpressionType` by its name, which was registered
   * using the `registerType` method. The returned `ExpressionType`
   * instance is an internal representation of the type in Expressions
   * service - do not mutate that object.
   */
  getType(name: string): ReturnType<Executor['getType']>;

  /**
   * Returns POJO map of all registered expression types, where keys are
   * names of the types and values are `ExpressionType` instances.
   */
  getTypes(): ReturnType<Executor['getTypes']>;

  /**
   * Executes expression string or a parsed expression AST and immediately
   * returns the result.
   *
   * Below example will execute `sleep 100 | clog` expression with `123` initial
   * input to the first function.
   *
   * ```ts
   * expressions.run('sleep 100 | clog', 123);
   * ```
   *
   * - `sleep 100` will delay execution by 100 milliseconds and pass the `123` input as
   *   its output.
   * - `clog` will print to console `123` and pass it as its output.
   * - The final result of the execution will be `123`.
   *
   * Optionally, you can pass an object as the third argument which will be used
   * to extend the `ExecutionContext`&mdash;an object passed to each function
   * as the third argument, that allows functions to perform side-effects.
   *
   * ```ts
   * expressions.run('...', null, { elasticsearchClient });
   * ```
   */
  run<Input, Output>(
    ast: string | ExpressionAstExpression,
    input: Input,
    params?: ExpressionExecutionParams
  ): Observable<ExecutionResult<Output | ExpressionValueError>>;

  /**
   * Starts expression execution and immediately returns `ExecutionContract`
   * instance that tracks the progress of the execution and can be used to
   * interact with the execution.
   */
  execute<Input = unknown, Output = unknown>(
    ast: string | ExpressionAstExpression,
    // This any is for legacy reasons.
    input: Input,
    params?: ExpressionExecutionParams
  ): ExecutionContract<Input, Output>;

  extract(state: ExpressionAstExpression): {
    state: ExpressionAstExpression;
    references: SavedObjectReference[];
  };

  inject(
    state: ExpressionAstExpression,
    references: SavedObjectReference[]
  ): ExpressionAstExpression;

  telemetry(
    state: ExpressionAstExpression,
    telemetryData: Record<string, unknown>
  ): Record<string, unknown>;

  getAllMigrations(): MigrateFunctionsObject;
}

export interface ExpressionServiceParams {
  executor?: Executor;
  logger?: Logger;
  renderers?: ExpressionRendererRegistry;
}

/**
 * `ExpressionsService` class is used for multiple purposes:
 *
 * 1. It implements the same Expressions service that can be used on both:
 *    (1) server-side and (2) browser-side.
 * 2. It implements the same Expressions service that users can fork/clone,
 *    thus have their own instance of the Expressions plugin.
 * 3. `ExpressionsService` defines the public contracts of *setup* and *start*
 *    Kibana Platform life-cycles for ease-of-use on server-side and browser-side.
 * 4. `ExpressionsService` creates a bound version of all exported contract functions.
 * 5. Functions are bound the way there are:
 *
 *    ```ts
 *    registerFunction = (...args: Parameters<Executor['registerFunction']>
 *      ): ReturnType<Executor['registerFunction']> => this.executor.registerFunction(...args);
 *    ```
 *
 *    so that JSDoc appears in developers IDE when they use those `plugins.expressions.registerFunction(`.
 */
export class ExpressionsService
  implements
    PersistableStateService<ExpressionAstExpression>,
    ExpressionsServiceSetup,
    ExpressionsServiceStart
{
  /**
   * @note Workaround since the expressions service is frozen.
   */
  private static started = new WeakSet<ExpressionsService>();
  public readonly executor: Executor;
  public readonly renderers: ExpressionRendererRegistry;

  constructor({
    logger,
    executor = Executor.createWithDefaults(logger),
    renderers = new ExpressionRendererRegistry(),
  }: ExpressionServiceParams = {}) {
    this.executor = executor;
    this.renderers = renderers;
  }

  private isStarted(): boolean {
    return ExpressionsService.started.has(this);
  }

  private assertSetup() {
    if (this.isStarted()) {
      throw new Error('The expression service is already started and can no longer be configured.');
    }
  }

  private assertStart() {
    if (!this.isStarted()) {
      throw new Error('The expressions service has not started yet.');
    }
  }

  public readonly getFunction: ExpressionsServiceStart['getFunction'] = (name, namespace) =>
    this.executor.getFunction(name, namespace);

  public readonly getFunctions: ExpressionsServiceStart['getFunctions'] = (namespace) =>
    this.executor.getFunctions(namespace);

  public readonly getRenderer: ExpressionsServiceStart['getRenderer'] = (name) => {
    this.assertStart();

    return this.renderers.get(name);
  };

  public readonly getRenderers: ExpressionsServiceStart['getRenderers'] = () => {
    this.assertStart();

    return this.renderers.toJS();
  };

  public readonly getType: ExpressionsServiceStart['getType'] = (name) => {
    this.assertStart();

    return this.executor.getType(name);
  };

  public readonly getTypes: ExpressionsServiceStart['getTypes'] = () => this.executor.getTypes();

  public readonly registerFunction: ExpressionsServiceSetup['registerFunction'] = (
    functionDefinition
  ) => this.executor.registerFunction(functionDefinition);

  public readonly registerType: ExpressionsServiceSetup['registerType'] = (typeDefinition) =>
    this.executor.registerType(typeDefinition);

  public readonly registerRenderer: ExpressionsServiceSetup['registerRenderer'] = (definition) =>
    this.renderers.register(definition);

  public readonly fork: ExpressionsServiceSetup['fork'] = (name) => {
    this.assertSetup();
    const fork = new ExpressionsServiceFork(name, this);
    return fork;
  };

  public readonly execute: ExpressionsServiceStart['execute'] = ((ast, input, params) => {
    this.assertStart();
    const execution = this.executor.createExecution(ast, params);
    execution.start(input);

    return execution.contract;
  }) as ExpressionsServiceStart['execute'];

  public readonly run: ExpressionsServiceStart['run'] = (ast, input, params) => {
    this.assertStart();
    return this.executor.run(ast, input, params);
  };

  /**
   * Extracts telemetry from expression AST
   * @param state expression AST to extract references from
   */
  public readonly telemetry = (
    state: ExpressionAstExpression,
    telemetryData: Record<string, unknown> = {}
  ) => {
    return this.executor.telemetry(state, telemetryData);
  };

  /**
   * Extracts saved object references from expression AST
   * @param state expression AST to extract references from
   * @returns new expression AST with references removed and array of references
   */
  public readonly extract = (state: ExpressionAstExpression) => {
    return this.executor.extract(state);
  };

  /**
   * Injects saved object references into expression AST
   * @param state expression AST to update
   * @param references array of saved object references
   * @returns new expression AST with references injected
   */
  public readonly inject = (state: ExpressionAstExpression, references: SavedObjectReference[]) => {
    return this.executor.inject(state, references);
  };

  /**
   * gets an object with semver mapped to a migration function
   */
  public getAllMigrations = () => {
    return this.executor.getAllMigrations();
  };

  /**
   * migrates an old expression to latest version
   * @param state
   */
  public migrateToLatest = (state: VersionedState) => {
    return this.executor.migrateToLatest(state);
  };

  /**
   * Returns Kibana Platform *setup* life-cycle contract. Useful to return the
   * same contract on server-side and browser-side.
   */
  public setup(...args: unknown[]): ExpressionsServiceSetup {
    for (const fn of [
      clog,
      createTable,
      font,
      variableSet,
      variable,
      theme,
      cumulativeSum,
      derivative,
      movingAverage,
      overallMetric,
      mapColumn,
      math,
      mathColumn,
    ]) {
      this.registerFunction(fn);
    }

    return this;
  }

  /**
   * Returns Kibana Platform *start* life-cycle contract. Useful to return the
   * same contract on server-side and browser-side.
   */
  public start(...args: unknown[]): ExpressionsServiceStart {
    ExpressionsService.started.add(this);

    return this;
  }

  public stop() {
    ExpressionsService.started.delete(this);
  }
}
