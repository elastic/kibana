/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseError } from 'vscode-jsonrpc';
import { Server } from '../kibana_types';
import { LspService } from '../lsp/lsp_service';
import { ServerOptions } from '../server_options';

export function lspRoute(server: Server, options: ServerOptions, lspService: LspService) {
  server.route({
    path: '/api/lsp/textDocument/{method}',
    async handler(req, reply) {
      if (typeof req.payload === 'object' && req.payload != null) {
        const method = req.params.method;
        if (method) {
          try {
            const result = await lspService.sendRequest(`textDocument/${method}`, req.payload);
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
