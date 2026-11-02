/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { RouteSecurity } from '@kbn/core/server';
import { ES_PROXY_API_VERSION, ES_PROXY_ROUTE_PATH } from '../../common';
import type { RouteDependencies } from '../types';
import { createProxyHandler, ES_REQUEST_TIMEOUT_MS } from './proxy_handler';

const MAX_PATH_LENGTH = 4096;
// Must outlast the Elasticsearch request so a timeout is answered with a 504 instead of a closed socket.
const IDLE_SOCKET_TIMEOUT_MS = ES_REQUEST_TIMEOUT_MS + 10_000;

const security: RouteSecurity = {
  authz: {
    enabled: false,
    reason:
      'Requests run as the current user through the scoped Elasticsearch client, so Elasticsearch ' +
      'enforces index and cluster privileges. Any authenticated Kibana user can reach any ' +
      'Elasticsearch API their Elasticsearch role allows.',
  },
};

const summary = 'Proxy a request to Elasticsearch';
const description =
  'Forwards the request method, path, query string and body to Elasticsearch as the current user ' +
  'and streams the response back. GET and HEAD requests cannot carry a body; use POST for ' +
  'search-style APIs such as `_search`, `_count` and `_msearch`.';

const params = schema.object({
  path: schema.maybe(schema.string({ maxLength: MAX_PATH_LENGTH })),
});

const bodyOptions = { output: 'stream', parse: false } as const;

/**
 * Registers the Elasticsearch proxy route for every supported method. HEAD is served by the GET route.
 */
export const registerProxyRoute = (deps: RouteDependencies): void => {
  const { router } = deps;
  const handler = createProxyHandler(deps);
  const config = {
    path: ES_PROXY_ROUTE_PATH,
    access: 'internal',
    security,
    summary,
    description,
  } as const;

  router.versioned
    .get({ ...config, options: { timeout: { idleSocket: IDLE_SOCKET_TIMEOUT_MS } } })
    .addVersion({ version: ES_PROXY_API_VERSION, validate: { request: { params } } }, handler);

  for (const method of ['post', 'put', 'delete'] as const) {
    router.versioned[method]({
      ...config,
      options: { body: bodyOptions, timeout: { idleSocket: IDLE_SOCKET_TIMEOUT_MS } },
    }).addVersion(
      {
        version: ES_PROXY_API_VERSION,
        validate: { request: { params, body: schema.maybe(schema.stream()) } },
      },
      handler
    );
  }
};
