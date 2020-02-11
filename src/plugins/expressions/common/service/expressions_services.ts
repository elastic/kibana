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

import { Executor } from '../executor';
import { ExpressionRendererRegistry } from '../expression_renderers';
import { ExpressionAstExpression } from '../ast';

export type ExpressionsServiceSetup = ReturnType<ExpressionsService['setup']>;
export type ExpressionsServiceStart = ReturnType<ExpressionsService['start']>;

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
export class ExpressionsService {
  public readonly executor = Executor.createWithDefaults();
  public readonly renderers = new ExpressionRendererRegistry();

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
  public readonly registerFunction = (
    ...args: Parameters<Executor['registerFunction']>
  ): ReturnType<Executor['registerFunction']> => this.executor.registerFunction(...args);

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
  public readonly run = <
    Input,
    Output,
    ExtraContext extends Record<string, unknown> = Record<string, unknown>
  >(
    ast: string | ExpressionAstExpression,
    input: Input,
    context?: ExtraContext
  ): Promise<Output> => this.executor.run<Input, Output, ExtraContext>(ast, input, context);

  public setup() {
    const { executor, renderers, registerFunction, run } = this;

    const getFunction = executor.getFunction.bind(executor);
    const getFunctions = executor.getFunctions.bind(executor);
    const getRenderer = renderers.get.bind(renderers);
    const getRenderers = renderers.toJS.bind(renderers);
    const getType = executor.getType.bind(executor);
    const getTypes = executor.getTypes.bind(executor);
    const registerRenderer = renderers.register.bind(renderers);
    const registerType = executor.registerType.bind(executor);

    return {
      getFunction,
      getFunctions,
      getRenderer,
      getRenderers,
      getType,
      getTypes,
      registerFunction,
      registerRenderer,
      registerType,
      run,
    };
  }

  public start() {
    const { executor, renderers, run } = this;

    const getFunction = executor.getFunction.bind(executor);
    const getFunctions = executor.getFunctions.bind(executor);
    const getRenderer = renderers.get.bind(renderers);
    const getRenderers = renderers.toJS.bind(renderers);
    const getType = executor.getType.bind(executor);
    const getTypes = executor.getTypes.bind(executor);

    return {
      getFunction,
      getFunctions,
      getRenderer,
      getRenderers,
      getType,
      getTypes,
      run,
    };
  }

  public stop() {}
}
