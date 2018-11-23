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

import { socketInterpreterProvider } from '../common/interpreter/socket_interpret';
import { serializeProvider } from '../common/lib/serialize';
import { getSocket } from './socket';
import { typesRegistry } from '../common/lib/types_registry';
import { createHandlers } from './create_handlers';
import { functionsRegistry } from '../common/lib/functions_registry';
import { getBrowserRegistries } from './browser_registries';

let socket;
let resolve;
const functionList = new Promise(_resolve => (resolve = _resolve));

export async function initialize() {
  socket = getSocket();

  // Listen for interpreter runs
  socket.on('run', ({ ast, context, id }) => {
    const types = typesRegistry.toJS();
    const { serialize, deserialize } = serializeProvider(types);
    interpretAst(ast, deserialize(context)).then(value => {
      socket.emit(`resp:${id}`, { value: serialize(value) });
    });
  });

  // Create the function list
  socket.emit('getFunctionList');
  socket.once('functionList', resolve);
  return functionList;
}

// Use the above promise to seed the interpreter with the functions it can defer to
export async function interpretAst(ast, context) {
  // Load plugins before attempting to get functions, otherwise this gets racey
  return Promise.all([functionList, getBrowserRegistries()])
    .then(([serverFunctionList]) => {
      return socketInterpreterProvider({
        types: typesRegistry.toJS(),
        handlers: createHandlers(socket),
        functions: functionsRegistry.toJS(),
        referableFunctions: serverFunctionList,
        socket: socket,
      });
    })
    .then(interpretFn => interpretFn(ast, context));
}
