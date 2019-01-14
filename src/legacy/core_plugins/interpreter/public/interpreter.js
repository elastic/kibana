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


import { initializeInterpreter, loadBrowserRegistries, createSocket } from '@kbn/interpreter/public';
import chrome from 'ui/chrome';
import { functions } from './functions';
import { functionsRegistry } from './functions_registry';
import { typesRegistry } from './types_registry';

const basePath = chrome.getBasePath();

const types = {
  browserFunctions: functionsRegistry,
  types: typesRegistry
};

function addFunction(fnDef) {
  functionsRegistry.register(fnDef);
}

functions.forEach(addFunction);

let _resolve;
let _interpreterPromise;

const initialize = async () => {
  await loadBrowserRegistries(types, basePath);
  const socket = await createSocket(basePath, functionsRegistry);
  initializeInterpreter(socket, typesRegistry, functionsRegistry).then(interpreter => {
    _resolve({ interpreter, socket });
  });
};

export const getInterpreter = async () => {
  if (!_interpreterPromise) {
    _interpreterPromise = new Promise(resolve => _resolve = resolve);
    initialize();
  }
  return await _interpreterPromise;
};

export const interpretAst = async (...params) => {
  const { interpreter } = await getInterpreter();
  return await interpreter.interpretAst(...params);
};

export const updateInterpreterFunctions = async () => {
  const { socket } =  await getInterpreter();
  socket.emit('updateFunctionList');
};
