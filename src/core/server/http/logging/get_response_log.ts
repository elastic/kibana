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
import { EcsEvent, Logger } from '../../logging';
import { getResponsePayloadBytes } from './get_payload_size';

const ECS_VERSION = '1.7.0';
const FORBIDDEN_HEADERS = ['authorization', 'cookie', 'set-cookie'];
const REDACTED_HEADER_TEXT = '[REDACTED]';

// We are excluding sensitive headers by default, until we have a log filtering mechanism.
function redactSensitiveHeaders(
  headers?: Record<string, string | string[]>
): Record<string, string | string[]> {
  const result = {} as Record<string, string | string[]>;
  if (headers) {
    for (const key of Object.keys(headers)) {
      result[key] = FORBIDDEN_HEADERS.includes(key) ? REDACTED_HEADER_TEXT : headers[key];
    }
  }
  return result;
}

/**
 * Converts a hapi `Request` into ECS-compliant `LogMeta` for logging.
 *
 * @internal
 */
export function getEcsResponseLog(request: Request, log: Logger): LogMeta {
  const { path, response } = request;
  const method = request.method.toUpperCase();

  const query = querystring.stringify(request.query);
  const pathWithQuery = query.length > 0 ? `${path}?${query}` : path;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const status_code = isBoom(response) ? response.output.statusCode : response.statusCode;
  const responseHeaders = isBoom(response) ? response.output.headers : response.headers;

  // borrowed from the hapi/good implementation
  const responseTime = (request.info.completed || request.info.responded) - request.info.received;
  const responseTimeMsg = !isNaN(responseTime) ? ` ${responseTime}ms` : '';

  const bytes = getResponsePayloadBytes(response, log);
  const bytesMsg = bytes ? ` - ${numeral(bytes).format('0.0b')}` : '';

  const meta: EcsEvent = {
    ecs: { version: ECS_VERSION },
    message: `${method} ${pathWithQuery} ${status_code}${responseTimeMsg}${bytesMsg}`,
    client: {
      ip: request.info.remoteAddress,
    },
    http: {
      request: {
        method,
        mime_type: request.mime,
        referrer: request.info.referrer,
        // @ts-expect-error Headers are not yet part of ECS: https://github.com/elastic/ecs/issues/232.
        headers: redactSensitiveHeaders(request.headers),
      },
      response: {
        body: {
          bytes,
        },
        status_code,
        // @ts-expect-error Headers are not yet part of ECS: https://github.com/elastic/ecs/issues/232.
        headers: redactSensitiveHeaders(responseHeaders),
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
  };

  return meta;
}
