/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import hapi from 'hapi';
// @ts-ignore
import wreck from 'wreck';
import { Logger } from '../log';
import { ServerOptions } from '../server_options';

export async function redirectRoute(
  server: hapi.Server,
  serverOptions: ServerOptions,
  log: Logger
) {
  const multiNode = serverOptions.multiNode;
  const mainNodeBaseUrl = async () => {
    const res = await wreck.request('HEAD', '/', {
      baseUrl: multiNode.mainNode,
    });
    if (res.statusCode === 302) {
      return res.headers.location;
    } else {
      // no base url?
      return '';
    }
  };
  const proxyHandler = {
    proxy: {
      passThrough: true,
      async mapUri(request: hapi.Request) {
        let uri;
        if (multiNode.noBasePath) {
          uri = `${multiNode.mainNode}${request.path}`;
        } else {
          // send a head request to find main node's base url;
          const baseUrl = await mainNodeBaseUrl();
          uri = `${multiNode.mainNode}${baseUrl}${request.path}`;
        }
        if (request.url.search) {
          uri += request.url.search;
        }
        log.info(`redirect ${request.path}${request.url.search} to ${uri}`);
        return {
          uri,
        };
      },
    },
  };
  server.route({
    path: '/api/code/{p*}',
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    handler: proxyHandler,
  });
  server.route({
    path: '/api/lsp/{p*}',
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    handler: proxyHandler,
  });
}
