/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import type { ResponseHeaders } from '@kbn/core-http-server';

// from https://github.com/nodejs/node/blob/v22.2.0/lib/internal/http2/util.js#L557
const ILLEGAL_HTTP2_CONNECTION_HEADERS = new Set([
  'connection',
  'proxy-connection',
  'keep-alive',
  'upgrade',
  'transfer-encoding',
  'http2-settings',
]);

/**
 * Return a new version of the provided headers, with all illegal http2 headers removed.
 * If `isDev` is `true`, will also log a warning if such header is encountered.
 */
export const stripIllegalHttp2Headers = ({
  headers,
  isDev,
  logger,
  requestContext,
}: {
  headers: ResponseHeaders;
  isDev: boolean;
  logger: Logger;
  requestContext: string;
}): ResponseHeaders => {
  return Object.entries(headers).reduce((output, [headerName, headerValue]) => {
    if (ILLEGAL_HTTP2_CONNECTION_HEADERS.has(headerName.toLowerCase())) {
      if (isDev) {
        logger.warn(
          `Handler for "${requestContext}" returned an illegal http2 header: ${headerName}. Please check "request.protocol" in handlers before assigning connection headers`
        );
      }
    } else {
      output[headerName as keyof ResponseHeaders] = headerValue;
    }
    return output;
  }, {} as ResponseHeaders);
};
