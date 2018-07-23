/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Hapi from 'hapi';

import { Log } from '../log';
import { LanguageServerController } from '../lsp/controller';
import { WorkspaceHandler } from '../lsp/workspace_handler';
import { ServerOptions } from '../server_options';

export async function lspRoute(server: Hapi.Server, options: ServerOptions) {
  const workspacePath: string = options.workspacePath;

  const repoPath: string = options.repoPath;

  const controller = new LanguageServerController('127.0.0.1', server);

  // TODO read from config which LSP should be used
  await controller.launchTypescript();

  server.route({
    path: '/api/lsp/textDocument/{method}',
    async handler(req: Hapi.Request, reply: Hapi.IReply) {
      if (typeof req.payload === 'object' && req.payload != null) {
        const method = req.params.method;
        if (method) {
          const workspaceHandler = new WorkspaceHandler(
            repoPath,
            workspacePath,
            new Log(server, ['LSP', 'workspace'])
          );
          const request = {
            method: `textDocument/${method}`,
            params: req.payload,
          };
          await workspaceHandler.handleRequest(request);
          controller.handleRequest(request).then(
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
