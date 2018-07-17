/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Hapi from 'hapi';
import { serve } from 'javascript-typescript-langserver/lib/server';

import { Log } from '../log';
import { LanguageServerProxy } from '../lsp/proxy';

import * as Path from 'path';

const lspPort = 20000;

export const proxy = new LanguageServerProxy(lspPort, '127.0.0.1', console);

export default async function(server: Hapi.Server) {
  const repodir = Path.join(__dirname, '../../');
  const log = new Log(server);

  log.info('root dir is ' + repodir);

  // start a embedded language server for js/ts
  serve({
    clusterSize: 1,
    lspPort,
  });

  proxy.listen();
  await proxy
    .initialize({}, [
      {
        uri: `file://${repodir}`,
        name: 'root',
      },
    ])
    .then(result => log.info(result));

  server.route({
    path: '/api/lsp/textDocument/{method}',
    async handler(req: Hapi.Request, reply: Hapi.IReply) {
      if (typeof req.payload === 'object' && req.payload != null) {
        // is it a json ?
        const method = req.params.method;
        if (method) {
          proxy.receiveRequest(`textDocument/${method}`, req.payload).then(
            result => {
              reply.response(result);
            },
            error => reply.response(error).code(500)
          );
        } else {
          reply.response('missing `method` in request').code(400);
        }
      } else {
        reply.response('json body required').code(400); // bad request
      }
    },
    method: 'POST',
    config: {
      payload: {
        allow: 'application/json',
      },
    },
  });
}
