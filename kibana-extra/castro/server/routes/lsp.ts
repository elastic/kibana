/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseError } from 'vscode-jsonrpc';

import { Server } from '../kibana_types';
import { Log } from '../log';
import { LanguageServerController } from '../lsp/controller';
import { WorkspaceHandler } from '../lsp/workspace_handler';
import { ServerOptions } from '../server_options';

export async function lspRoute(server: Server, options: ServerOptions) {
  const workspacePath: string = options.workspacePath;

  const repoPath: string = options.repoPath;

  const controller = new LanguageServerController('127.0.0.1', server);

  // TODO read from config which LSP should be used
  await controller.launchTypescript();

  server.route({
    path: '/api/lsp/textDocument/{method}',
    async handler(req, reply) {
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
          try {
            await workspaceHandler.handleRequest(request);
            const result = await controller.handleRequest(request);
            reply.response(result);
          } catch (error) {
            if (error instanceof ResponseError) {
              reply
                .response(error.toJson())
                .type('json')
                .code(503); // different code for LS errors and other internal errors.
            } else {
              reply
                .response(JSON.stringify(error))
                .type('json')
                .code(500);
            }
          }
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
