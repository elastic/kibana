/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import querystring from 'querystring';
import { isBoom } from '@hapi/boom';
import type { Request } from '@hapi/hapi';
import numeral from '@elastic/numeral';
import { LogMeta } from '@kbn/logging';
import { Logger } from '../../logging';
import { getResponsePayloadBytes } from './get_payload_size';
import type { KibanaRequestState } from '../router';

const FORBIDDEN_HEADERS = ['authorization', 'cookie', 'set-cookie'];
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

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const status_code = isBoom(response) ? response.output.statusCode : response.statusCode;

  const requestHeaders = cloneAndFilterHeaders(request.headers);
  const responseHeaders = cloneAndFilterHeaders(
    isBoom(response) ? (response.output.headers as HapiHeaders) : response.headers
  );

  // borrowed from the hapi/good implementation
  const responseTime = (request.info.completed || request.info.responded) - request.info.received;
  const responseTimeMsg = !isNaN(responseTime) ? ` ${responseTime}ms` : '';

  const bytes = getResponsePayloadBytes(response, log);
  const bytesMsg = bytes ? ` - ${numeral(bytes).format('0.0b')}` : '';

  const traceId = (request.app as KibanaRequestState).traceId;

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
      response: {
        body: {
          bytes,
        },
        status_code,
        // @ts-expect-error ECS custom field: https://github.com/elastic/ecs/issues/232.
        headers: responseHeaders,
        // responseTime is a custom non-ECS field
        responseTime: !isNaN(responseTime) ? responseTime : undefined,
      },
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
    message: `${method} ${pathWithQuery} ${status_code}${responseTimeMsg}${bytesMsg}`,
    meta,
  };
}
