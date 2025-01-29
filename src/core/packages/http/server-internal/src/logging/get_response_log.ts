/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import querystring from 'querystring';
import { isBoom } from '@hapi/boom';
import type { Request } from '@hapi/hapi';
import numeral from '@elastic/numeral';
import type { LogMeta, Logger } from '@kbn/logging';
import type { KibanaRequestState } from '@kbn/core-http-server';
import { getResponsePayloadBytes } from './get_payload_size';

// If you are updating these, consider whether they should also be updated in the
// elasticsearch service `getEcsResponseLog`
const FORBIDDEN_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-elastic-app-auth',
  'es-client-authentication',
];
const REDACTED_HEADER_TEXT = '[REDACTED]';

type HapiHeaders = Record<string, string | string[]>;

// We are excluding sensitive headers by default, until we have a log filtering mechanism.
function redactSensitiveHeaders(key: string, value: string | string[]): string | string[] {
  return FORBIDDEN_HEADERS.includes(key) ? REDACTED_HEADER_TEXT : value;
}

// Shallow clone the headers so they are not mutated if filtered by a RewriteAppender.
function cloneAndFilterHeaders(headers?: HapiHeaders) {
  const result = {} as HapiHeaders;
  if (headers) {
    for (const key of Object.keys(headers)) {
      result[key] = redactSensitiveHeaders(
        key,
        Array.isArray(headers[key]) ? [...headers[key]] : headers[key]
      );
    }
  }
  return result;
}

/**
 * Converts a hapi `Request` into ECS-compliant `LogMeta` for logging.
 *
 * @internal
 */
export function getEcsResponseLog(request: Request, log: Logger) {
  const { path, response } = request;
  const method = request.method.toUpperCase();

  const query = querystring.stringify(request.query);
  const pathWithQuery = query.length > 0 ? `${path}?${query}` : path;

  const requestHeaders = cloneAndFilterHeaders(request.headers);

  // borrowed from the hapi/good implementation
  const responseTime = (request.info.completed || request.info.responded) - request.info.received;
  const responseTimeMsg = responseTime >= 0 ? ` ${responseTime}ms` : '';

  const bytes = response ? getResponsePayloadBytes(response, log) : undefined;
  const bytesMsg = bytes ? ` - ${numeral(bytes).format('0.0b')}` : '';

  const traceId = (request.app as KibanaRequestState).traceId;

  const responseLogObj = response
    ? {
        response: {
          body: {
            bytes,
          },
          status_code: isBoom(response) ? response.output.statusCode : response.statusCode,
          headers: cloneAndFilterHeaders(
            isBoom(response) ? (response.output.headers as HapiHeaders) : response.headers
          ),
          responseTime: !isNaN(responseTime) ? responseTime : undefined,
        },
      }
    : {};

  const message = response
    ? `${method} ${pathWithQuery} ${responseLogObj.response?.status_code}${responseTimeMsg}${bytesMsg}`
    : `${method} ${pathWithQuery}`;

  const meta: LogMeta = {
    client: {
      ip: request.info.remoteAddress,
    },
    http: {
      request: {
        method,
        mime_type: request.mime,
        referrer: request.info.referrer,
        // @ts-expect-error ECS custom field: https://github.com/elastic/ecs/issues/232.
        headers: requestHeaders,
      },
      ...responseLogObj,
    },
    url: {
      path,
      query,
    },
    user_agent: {
      original: request.headers['user-agent'],
    },
    trace: traceId ? { id: traceId } : undefined,
  };

  return {
    message,
    meta,
  };
}
