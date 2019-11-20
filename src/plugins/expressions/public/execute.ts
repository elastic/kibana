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

import { fromExpression, toExpression } from '@kbn/interpreter/common';
import { DataAdapter, RequestAdapter, Adapters } from '../../inspector/public';
import { getInterpreter } from './services';
import { IExpressionLoaderParams, IInterpreterResult } from './types';
import { ExpressionAST } from '../common/types';

/**
 * The search context describes a specific context (filters, time range and query)
 * that will be applied to the expression for execution. Not every expression will
 * be effected by that. You have to use special functions
 * that will pick up this search context and forward it to following functions that
 * understand it.
 */

export class ExpressionDataHandler {
  private abortController: AbortController;
  private expression: string;
  private ast: ExpressionAST;

  private inspectorAdapters: Adapters;
  private promise: Promise<IInterpreterResult>;

  public isPending: boolean = true;
  constructor(expression: string | ExpressionAST, params: IExpressionLoaderParams) {
    if (typeof expression === 'string') {
      this.expression = expression;
      this.ast = fromExpression(expression) as ExpressionAST;
    } else {
      this.ast = expression;
      this.expression = toExpression(this.ast);
    }

    this.abortController = new AbortController();
    this.inspectorAdapters = params.inspectorAdapters || this.getActiveInspectorAdapters();

    const getInitialContext = () => ({
      type: 'kibana_context',
      ...params.searchContext,
    });

    const defaultContext = { type: 'null' };

    const interpreter = getInterpreter();
    this.promise = interpreter
      .interpretAst(this.ast, params.context || defaultContext, {
        getInitialContext,
        inspectorAdapters: this.inspectorAdapters,
        abortSignal: this.abortController.signal,
      })
      .then(
        (v: IInterpreterResult) => {
          this.isPending = false;
          return v;
        },
        () => {
          this.isPending = false;
        }
      );
  }

  cancel = () => {
    this.abortController.abort();
  };

  getData = async () => {
    try {
      return await this.promise;
    } catch (e) {
      return {
        type: 'error',
        error: {
          type: e.type,
          message: e.message,
          stack: e.stack,
        },
      };
    }
  };

  getExpression = () => {
    return this.expression;
  };

  getAst = () => {
    return this.ast;
  };

  inspect = () => {
    return this.inspectorAdapters;
  };

  /**
   * Returns an object of all inspectors for this vis object.
   * This must only be called after this.type has properly be initialized,
   * since we need to read out data from the the vis type to check which
   * inspectors are available.
   */
  private getActiveInspectorAdapters = (): Adapters => {
    const adapters: Adapters = {};

    // Add the requests inspector adapters if the vis type explicitly requested it via
    // inspectorAdapters.requests: true in its definition or if it's using the courier
    // request handler, since that will automatically log its requests.
    adapters.requests = new RequestAdapter();

    // Add the data inspector adapter if the vis type requested it or if the
    // vis is using courier, since we know that courier supports logging
    // its data.
    adapters.data = new DataAdapter();

    return adapters;
  };
}

export function execute(
  expression: string | ExpressionAST,
  params: IExpressionLoaderParams = {}
): ExpressionDataHandler {
  return new ExpressionDataHandler(expression, params);
}
