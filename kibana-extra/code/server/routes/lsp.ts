/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import hapi from 'hapi';
import { entries, groupBy } from 'lodash';
import { ResponseError } from 'vscode-jsonrpc';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { Location } from 'vscode-languageserver-types';
import { parseLspUrl } from '../../common/uri_util';
import { GitOperations } from '../git_operations';
import { Log } from '../log';
import { LspService } from '../lsp/lsp_service';
import { SymbolSearchClient } from '../search';
import { ServerOptions } from '../server_options';
import { detectLanguage } from '../utils/detect_language';
import {
  expandRanges,
  extractSourceContent,
  LineMapping,
  mergeRanges,
} from '../utils/source_merger';
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
              serverOptions.lspRequestTimeout,
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
  });

  server.route({
    path: '/api/lsp/findReferences',
    method: 'POST',
    async handler(req, h: hapi.ResponseToolkit) {
      try {
        const response: ResponseMessage = await promiseTimeout(
          serverOptions.lspRequestTimeout,
          lspService.sendRequest(`textDocument/references`, req.payload)
        );
        const gitOperations = new GitOperations(serverOptions.repoPath);
        const files = [];
        for (const entry of entries(groupBy(response.result as Location[], 'uri'))) {
          const uri: string = entry[0];
          const { repoUri, revision, file } = parseLspUrl(uri)!;
          const locations: Location[] = entry[1];
          const lines = locations.map(l => ({
            startLine: l.range.start.line,
            endLine: l.range.end.line,
          }));
          const ranges = expandRanges(lines, 3);
          const mergedRanges = mergeRanges(ranges);
          const blob = await gitOperations.fileContent(repoUri, file, revision);
          const source = blob
            .content()
            .toString('utf8')
            .split('\n');
          const language = await detectLanguage(file!, blob.content());
          const lineMappings = new LineMapping();
          const code = extractSourceContent(mergedRanges, source, lineMappings).join('\n');
          const lineNumbers = lineMappings.toStringArray('...', 1);
          const highlights = locations.map(l => {
            const { start, end } = l.range;
            const startLineNumber = lineMappings.lineNumber(start.line, 1);
            const endLineNumber = lineMappings.lineNumber(end.line, 1);
            return {
              startLineNumber,
              startColumn: start.character + 1,
              endLineNumber,
              endColumn: end.character + 1,
            };
          });
          files.push({
            repo: repoUri,
            file,
            language,
            uri,
            revision,
            code,
            lineNumbers,
            highlights,
          });
        }
        return groupBy(files, 'repo');
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
