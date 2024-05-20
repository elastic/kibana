/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ExpressionExecutionParams,
  ExpressionsService,
  ExpressionsServiceSetup,
  ExpressionsServiceStart,
} from '.';
import { ExpressionAstExpression } from '../ast';
import { AnyExpressionFunctionDefinition } from '../expression_functions';
import { AnyExpressionTypeDefinition } from '../expression_types';
import { AnyExpressionRenderDefinition } from '../expression_renderers';

export interface ExpressionServiceFork {
  setup(): ExpressionsServiceSetup;
  start(): ExpressionsServiceStart;
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
export class ExpressionsServiceFork implements ExpressionServiceFork {
  /**
   * @note Workaround since the expressions service is frozen.
   */
  constructor(private namespace: string, private expressionsService: ExpressionsService) {
    this.registerFunction = this.registerFunction.bind(this);
    this.registerRenderer = this.registerRenderer.bind(this);
    this.registerType = this.registerType.bind(this);
    this.run = this.run.bind(this);
    this.execute = this.execute.bind(this);
    this.getFunction = this.getFunction.bind(this);
    this.getFunctions = this.getFunctions.bind(this);
  }

  protected registerFunction(
    definition: AnyExpressionFunctionDefinition | (() => AnyExpressionFunctionDefinition)
  ) {
    if (typeof definition === 'function') definition = definition();
    return this.expressionsService.registerFunction({
      ...definition,
      namespace: this.namespace,
    });
  }

  protected registerRenderer(
    definition: AnyExpressionRenderDefinition | (() => AnyExpressionRenderDefinition)
  ) {
    if (typeof definition === 'function') definition = definition();
    return this.expressionsService.registerRenderer({
      ...definition,
      namespace: this.namespace,
    });
  }

  protected registerType(
    definition: AnyExpressionTypeDefinition | (() => AnyExpressionTypeDefinition)
  ) {
    if (typeof definition === 'function') definition = definition();
    return this.expressionsService.registerType({ ...definition, namespace: this.namespace });
  }

  protected run<Input, Output>(
    ast: string | ExpressionAstExpression,
    input: Input,
    params?: ExpressionExecutionParams
  ) {
    return this.expressionsService.run<Input, Output>(ast, input, {
      ...params,
      namespace: this.namespace,
    });
  }

  protected execute<Input = unknown, Output = unknown>(
    ast: string | ExpressionAstExpression,
    input: Input,
    params?: ExpressionExecutionParams
  ) {
    return this.expressionsService.execute<Input, Output>(ast, input, {
      ...params,
      namespace: this.namespace,
    });
  }

  protected getFunction(name: string) {
    return this.expressionsService.getFunction(name, this.namespace);
  }

  protected getFunctions() {
    return this.expressionsService.getFunctions(this.namespace);
  }
  /**
   * Returns Kibana Platform *setup* life-cycle contract. Useful to return the
   * same contract on server-side and browser-side.
   */
  public setup(): ExpressionsServiceSetup {
    return {
      ...this.expressionsService,
      registerFunction: this.registerFunction,
      registerRenderer: this.registerRenderer,
      registerType: this.registerType,
    };
  }

  /**
   * Returns Kibana Platform *start* life-cycle contract. Useful to return the
   * same contract on server-side and browser-side.
   */
  public start(): ExpressionsServiceStart {
    return {
      ...this.expressionsService,
      run: this.run,
      execute: this.execute,
      getFunction: this.getFunction,
      getFunctions: this.getFunctions,
    };
  }
}
