/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { socketInterpreterProvider } from '../../../../packages/kbn-interpreter/common/interpreter/socket_interpret';
import { serializeProvider } from '../../../../packages/kbn-interpreter/common/lib/serialize';
import { socket } from './socket';
import { typesRegistry } from '../../../../packages/kbn-interpreter/common/lib/types_registry';
import { createHandlers } from './create_handlers';
import { functionsRegistry } from '../../../../x-pack/plugins/canvas/public/lib/functions_registry';
import { loadBrowserPlugins } from '../../../../x-pack/plugins/canvas/public/lib/load_browser_plugins';

// Create the function list
socket.emit('getFunctionList');
export const getServerFunctions = new Promise(resolve => socket.once('functionList', resolve));

// Use the above promise to seed the interpreter with the functions it can defer to
export function interpretAst(ast, context) {
  // Load plugins before attempting to get functions, otherwise this gets racey
  return Promise.all([getServerFunctions, loadBrowserPlugins()])
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

socket.on('run', ({ ast, context, id }) => {
  const types = typesRegistry.toJS();
  const { serialize, deserialize } = serializeProvider(types);
  interpretAst(ast, deserialize(context)).then(value => {
    socket.emit(`resp:${id}`, { value: serialize(value) });
  });
});
