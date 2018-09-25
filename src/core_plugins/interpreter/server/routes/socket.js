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

import socket from 'socket.io';
import { createHandlers } from '@kbn/interpreter/server';
import { socketInterpreterProvider } from '@kbn/interpreter/common/interpreter/socket_interpret';
import { serializeProvider } from '@kbn/interpreter/common/lib/serialize';
import { functionsRegistry } from '@kbn/interpreter/common/lib/functions_registry';
import { typesRegistry } from '@kbn/interpreter/common/lib/types_registry';
import { getAuthHeader } from './get_auth/get_auth_header';
import { loadServerPlugins } from '../lib/load_server_plugins';

export function socketApi(server) {
  const io = socket(server.listener, { path: '/socket.io' });
  loadServerPlugins();

  io.on('connection', socket => {
    // This is the HAPI request object
    const request = socket.handshake;

    const authHeader = getAuthHeader(request, server);

    // Create the function list
    socket.emit('getFunctionList');
    const getClientFunctions = new Promise(resolve => socket.once('functionList', resolve));

    socket.on('getFunctionList', () => {
      socket.emit('functionList', functionsRegistry.toJS());
    });

    const handler = ({ ast, context, id }) => {
      Promise.all([getClientFunctions, authHeader]).then(([clientFunctions, authHeader]) => {
        if (server.plugins.security) request.headers.authorization = authHeader;

        const types = typesRegistry.toJS();
        const interpret = socketInterpreterProvider({
          types,
          functions: functionsRegistry.toJS(),
          handlers: createHandlers(request, server),
          referableFunctions: clientFunctions,
          socket: socket,
        });

        const { serialize, deserialize } = serializeProvider(types);
        return interpret(ast, deserialize(context))
          .then(value => {
            socket.emit(`resp:${id}`, { value: serialize(value) });
          })
          .catch(e => {
            socket.emit(`resp:${id}`, {
              error: e.message,
              stack: e.stack,
            });
          });
      });
    };

    socket.on('run', handler);
    socket.on('disconnect', () => {
      socket.removeListener('run', handler);
    });
  });
}
