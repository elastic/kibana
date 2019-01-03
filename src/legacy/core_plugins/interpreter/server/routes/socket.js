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
import { serializeProvider } from '@kbn/interpreter/common';
import { routeExpressionProvider } from '../lib/route_expression/index';
import { browser } from '../lib/route_expression/browser';
import { thread } from '../lib/route_expression/thread/index';
import { server as serverEnv } from '../lib/route_expression/server';
import { getRequest } from '../lib/get_request';
import { API_ROUTE } from '../../common/constants';

async function getModifiedRequest(server, socket) {
  try {
    return await getRequest(server, socket.handshake);
  } catch (err) {
    // on errors, notify the client and close the connection
    socket.emit('connectionFailed', { reason: err.message || 'Socket connection failed' });
    socket.disconnect(true);
    return false;
  }
}

export function socketApi(server) {
  // add a POST ping route for `getRequest` to use
  // TODO: remove this once we have upstream socket support
  server.route({
    method: 'POST',
    path: `${API_ROUTE}/ping`,
    handler: () => 'pong',
  });

  const io = socket(server.listener, { path: '/socket.io' });

  io.on('connection', async socket => {
    // 'request' is the modified hapi request object
    const request = await getModifiedRequest(server, socket);
    if (!request) return; // do nothing without the request object

    const types = server.plugins.interpreter.types.toJS();
    const { serialize, deserialize } = serializeProvider(types);

    // I'd love to find a way to generalize all of these, but they each need a different set of things
    // Note that ORDER MATTERS here. The environments will be tried in this order. Do not reorder this array.
    const routeExpression = routeExpressionProvider([
      thread({ onFunctionNotFound, serialize, deserialize }),
      serverEnv({ onFunctionNotFound, request, server }),
      browser({ onFunctionNotFound, socket, serialize, deserialize }),
    ]);

    function onFunctionNotFound(ast, context) {
      return routeExpression(ast, context);
    }

    socket.on('getFunctionList', () => {
      socket.emit('functionList', server.plugins.interpreter.serverFunctions.toJS());
    });

    socket.on('run', async ({ ast, context, id }) => {
      try {
        const value = await routeExpression(ast, deserialize(context));
        socket.emit(`resp:${id}`, { type: 'msgSuccess', value: serialize(value) });
      } catch (err) {
        // TODO: I don't think it is possible to hit this right now? Maybe ever?
        socket.emit(`resp:${id}`, { type: 'msgError', value: err });
      }
    });

    socket.on('disconnect', () => {
      // remove all listeners on disconnect
      socket.removeAllListeners();
    });
  });
}
