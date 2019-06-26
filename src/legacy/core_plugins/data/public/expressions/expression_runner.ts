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

import { Ast, fromExpression } from '@kbn/interpreter/common';

import { RequestAdapter, DataAdapter } from 'ui/inspector/adapters';
import { RenderFunctionsRegistry, Interpreter, Result } from './expressions_service';

export interface ExpressionRunnerOptions {
  // TODO use the real types here once they are ready
  context?: object;
  getInitialContext?: () => object;
  element?: Element;
}

export type ExpressionRunner = (
  expression: string | Ast,
  options: ExpressionRunnerOptions
) => Promise<Result>;

export const createRunFn = (
  renderersRegistry: RenderFunctionsRegistry,
  interpreterPromise: Promise<Interpreter>
): ExpressionRunner => async (expressionOrAst, { element, context, getInitialContext }) => {
  // TODO: make interpreter initialization synchronous to avoid this
  const interpreter = await interpreterPromise;
  const ast =
    typeof expressionOrAst === 'string' ? fromExpression(expressionOrAst) : expressionOrAst;

  const response = await interpreter.interpretAst(ast, context || { type: 'null' }, {
    getInitialContext: getInitialContext || (() => ({})),
    inspectorAdapters: {
      // TODO connect real adapters
      requests: new RequestAdapter(),
      data: new DataAdapter(),
    },
  });

  if (response.type === 'error') {
    throw response;
  }

  if (element) {
    if (response.type === 'render' && response.as && renderersRegistry.get(response.as) !== null) {
      renderersRegistry.get(response.as).render(element, response.value, {
        onDestroy: fn => {
          // TODO implement
        },
        done: () => {
          // TODO implement
        },
      });
    } else {
      throw response;
    }
  }

  return response;
};
