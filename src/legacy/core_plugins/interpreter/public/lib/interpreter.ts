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

import { ExpressionInterpret } from 'src/plugins/expressions/common/expressions/interpreter_provider';
import { interpreterProvider } from '../../common';
import { createHandlers } from './create_handlers';
import { registries } from '../registries';
import { FunctionHandlers } from '../../types';

export type ExpressionInterpretWithHandlers = (
  ast: Parameters<ExpressionInterpret>[0],
  context: Parameters<ExpressionInterpret>[1],
  handlers: FunctionHandlers
) => ReturnType<ExpressionInterpret>;

export interface ExpressionInterpreter {
  interpretAst: ExpressionInterpretWithHandlers;
}

export interface ExpressionExecutor {
  interpreter: ExpressionInterpreter;
}

export async function initializeExecutor(): Promise<ExpressionExecutor> {
  const interpretAst: ExpressionInterpretWithHandlers = async (ast, context, handlers) => {
    const interpret = await interpreterProvider({
      types: registries.types.toJS(),
      handlers: { ...handlers, ...createHandlers() },
      functions: registries.browserFunctions.toJS(),
    });
    return interpret(ast, context);
  };

  return { interpreter: { interpretAst } };
}
