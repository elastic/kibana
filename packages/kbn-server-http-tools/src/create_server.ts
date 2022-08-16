/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import cors from '@fastify/cors';
import type { FastifyCorsOptions } from '@fastify/cors';
import Fastify from 'fastify';
import type { FastifyServerOptions } from 'fastify';
import uuid from 'uuid';

const BAD_REQUEST = Buffer.from('HTTP/1.1 400 Bad Request\r\n\r\n', 'ascii');

export function createServer(
  serverOptions: FastifyServerOptions,
  corsOptions: FastifyCorsOptions | false = false
) {
  const server = Fastify({
    ...serverOptions,
    genReqId: (req) => uuid.v4(),
    // TODO: Instead of the below handler, we could use the default (which is json): https://github.com/fastify/fastify/blob/e618c7cd7d9d7b067aebdc4dbde22c290d8e3987/fastify.js#L603-L628
    clientErrorHandler(err, socket) {
      if (socket.writable) {
        socket.end(BAD_REQUEST);
      } else {
        socket.destroy(err);
      }
    },
  });

  server.addHook('onTimeout', async (request) => {
    // TODO: Does it need to be async?
    request.socket.destroy();
  });

  if (corsOptions) {
    server.register(cors, corsOptions);
  }

  return server;
}
