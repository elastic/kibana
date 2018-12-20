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


import { initializeInterpreter as initialize } from '@kbn/interpreter/public';

let _resolve;
const interpreterPromise = new Promise(resolve => { _resolve = resolve; });
let interpreter;

export const initializeInterpreter = async (socket, typesRegistry, functionsRegistry) => {
  interpreter = await initialize(socket, typesRegistry, functionsRegistry);
  _resolve(interpreter);
  return interpreter;
};

export const getInitializedFunctions = async () => {
  await interpreterPromise;
  const result = await interpreter.getInitializedFunctions();
  return result;
};

export const interpretAst = async (ast, context, handlers) => {
  await interpreterPromise;
  const result = await interpreter.interpretAst(ast, context, handlers);
  return result;
};

