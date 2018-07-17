/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Hapi from 'hapi';

import { Log } from '../log';
import { LanguageServerController } from '../lsp/controller';

import * as Path from 'path';

export default async function(server: Hapi.Server) {
  const repodir = Path.join(__dirname, '../../');
  const log = new Log(server);

  log.info('root dir is ' + repodir);

  const controller = new LanguageServerController('127.0.0.1', console, server);

  // TODO read from config which LSP should be used
  await controller.launchTypescript();

  controller.listen();
  await controller
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
          controller.receiveRequest(`textDocument/${method}`, req.payload).then(
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
