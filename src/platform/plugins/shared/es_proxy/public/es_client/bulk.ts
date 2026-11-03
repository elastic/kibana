/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ProxyTransport } from './proxy_transport';
import { toNdjson } from './proxy_transport';
import type { EsProxyClient } from './types';

type BulkParams = Parameters<EsProxyClient['bulk']>[0];

const NON_QUERY_KEYS: ReadonlySet<string> = new Set(['index', 'operations', 'body', 'querystring']);

/**
 * Creates `client.bulk`. The generated elasticsearch-js `bulk` module loads the Node transport,
 * so it is reimplemented here with the same request shape.
 */
export const createBulk =
  (transport: ProxyTransport): EsProxyClient['bulk'] =>
  async (params: BulkParams, options) => {
    const operations =
      params.operations ?? (typeof params.body === 'string' ? params.body : undefined);
    if (operations == null) {
      throw new Error('Missing required parameter [operations]');
    }
    const querystring: Record<string, unknown> = { ...params.querystring };
    for (const [key, value] of Object.entries(params)) {
      if (!NON_QUERY_KEYS.has(key)) {
        querystring[key] = value;
      }
    }
    const path = params.index == null ? '/_bulk' : `/${encodeURIComponent(params.index)}/_bulk`;

    const response = await transport.request(
      {
        method: 'POST',
        path,
        querystring,
        bulkBody: typeof operations === 'string' ? operations : toNdjson(operations),
      },
      options
    );
    return response as BulkResponse;
  };
