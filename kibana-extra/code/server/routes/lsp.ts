/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import hapi from 'hapi';
import { ResponseError } from 'vscode-jsonrpc';
import { Log } from '../log';
import { LspService } from '../lsp/lsp_service';
import { SymbolSearchClient } from '../search';
import { ServerOptions } from '../server_options';
import { promiseTimeout } from '../utils/timeout';

export function lspRoute(
  server: hapi.Server,
  lspService: LspService,
  serverOptions: ServerOptions
) {
  server.route({
    path: '/api/lsp/textDocument/{method}',
    async handler(req, h: hapi.ResponseToolkit) {
      if (typeof req.payload === 'object' && req.payload != null) {
        const method = req.params.method;
        if (method) {
          try {
            const result = await promiseTimeout(
              serverOptions.lspRequestTimeout * 1000,
              lspService.sendRequest(`textDocument/${method}`, req.payload)
            );
            return result;
          } catch (error) {
            const log = new Log(server);
            log.error(error);
            if (error instanceof ResponseError) {
              return h
                .response(error.toJson())
                .type('json')
                .code(503); // different code for LS errors and other internal errors.
            } else if (error.isBoom) {
              return error;
            } else {
              return h
                .response(JSON.stringify(error))
                .type('json')
                .code(500);
            }
          }
        } else {
          return h.response('missing `method` in request').code(400);
        }
      } else {
        return h.response('json body required').code(400); // bad request
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

export function symbolByQnameRoute(server: hapi.Server, symbolSearchClient: SymbolSearchClient) {
  server.route({
    path: '/api/lsp/symbol/{qname}',
    method: 'GET',
    async handler(req, reply) {
      try {
        const res = await symbolSearchClient.findByQname(req.params.qname);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception ${error}`);
      }
    },
  });
}
