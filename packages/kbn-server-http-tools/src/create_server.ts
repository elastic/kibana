/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Server, ServerOptions } from '@hapi/hapi';
import { ListenerOptions } from './get_listener_options';

export function createServer(serverOptions: ServerOptions, listenerOptions: ListenerOptions) {
  const server = new Server(serverOptions);

  // TODO add a condition based on protocol version
  // server.listener.keepAliveTimeout = listenerOptions.keepaliveTimeout;
  server.listener.setTimeout(listenerOptions.socketTimeout);
  server.listener.on('timeout', (socket) => {
    socket.destroy();
  });
  server.listener.on('clientError', (err, socket) => {
    if (socket.writable) {
      socket.end(Buffer.from('HTTP/1.1 400 Bad Request\r\n\r\n', 'ascii'));
    } else {
      socket.destroy(err);
    }
  });

  return server;
}
