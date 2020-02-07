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

import 'uiExports/interpreter';
// @ts-ignore
import { register, registryFactory } from '@kbn/interpreter/common';
import { npSetup } from 'ui/new_platform';
import { registries } from './registries';
import {
  ExpressionInterpretWithHandlers,
  ExpressionExecutor,
} from '../../../../plugins/expressions/public';

// Expose kbnInterpreter.register(specs) and kbnInterpreter.registries() globally so that plugins
// can register without a transpile step.
// TODO: This will be left behind in then legacy platform?
(global as any).kbnInterpreter = Object.assign(
  (global as any).kbnInterpreter || {},
  registryFactory(registries)
);

// TODO: This function will be left behind in the legacy platform.
let executorPromise: Promise<ExpressionExecutor> | undefined;
export const getInterpreter = async () => {
  if (!executorPromise) {
    const executor = npSetup.plugins.expressions.__LEGACY.getExecutor();
    executorPromise = Promise.resolve(executor);
  }
  return await executorPromise;
};

// TODO: This function will be left behind in the legacy platform.
export const interpretAst: ExpressionInterpretWithHandlers = async (ast, context, handlers) => {
  const { interpreter } = await getInterpreter();
  return await interpreter.interpretAst(ast, context, handlers);
};
