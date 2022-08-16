/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IncomingHttpHeaders } from 'http';
import querystring from 'querystring';
import { isBoom } from '@hapi/boom';
import numeral from '@elastic/numeral';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { LogMeta, Logger } from '@kbn/logging';
import type { ResponseHeaders } from '@kbn/core-http-server';
import { getResponsePayloadBytes } from './get_payload_size';

// If you are updating these, consider whether they should also be updated in the
// elasticsearch service `getEcsResponseLog`
const FORBIDDEN_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-elastic-app-auth'];
const REDACTED_HEADER_TEXT = '[REDACTED]';

type HapiHeaders = Record<string, string | string[]>;

// We are excluding sensitive headers by default, until we have a log filtering mechanism.
function redactSensitiveHeaders(key: string, value: string | string[]): string | string[] {
  return FORBIDDEN_HEADERS.includes(key) ? REDACTED_HEADER_TEXT : value;
}

// Shallow clone the headers so they are not mutated if filtered by a RewriteAppender.
function cloneAndFilterHeaders(headers?: IncomingHttpHeaders | ResponseHeaders) {
  const result = {} as IncomingHttpHeaders;
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      result[key] = redactSensitiveHeaders(
        key,
        Array.isArray(value) ? [...value] : (value as string | string[]) // TODO: Annoying that I have to use `as` here instead of being able to set `value` to the correct type upon creation
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
export function getEcsResponseLog(request: FastifyRequest, reply: FastifyReply, log: Logger) {
  const { url: path } = request.raw;
  const method = request.method.toUpperCase();

  const query = querystring.stringify(request.query as any);
  const pathWithQuery = query.length > 0 ? `${path}?${query}` : path;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const status_code = isBoom(reply) ? reply.output.statusCode : reply.statusCode; // TODO: Complete conversion to Fastify - A Fastify reply is never boom

  const requestHeaders = cloneAndFilterHeaders(request.headers);
  const responseHeaders = cloneAndFilterHeaders(
    isBoom(reply) ? (reply.output.headers as HapiHeaders) : reply.getHeaders()
  );

  const responseTime = reply.getResponseTime();
  const responseTimeMsg = ` ${responseTime}ms`;

  const bytes = getResponsePayloadBytes(reply, log);
  const bytesMsg = bytes ? ` - ${numeral(bytes).format('0.0b')}` : '';

  // TODO: Where to get this from APM directly?
  // const traceId = (request.context.config as KibanaRequestState).traceId;

  const meta: LogMeta = {
    client: {
      ip: request.socket.remoteAddress,
    },
    http: {
      request: {
        method,
        mime_type: 'TODO', // request.mime, // TODO: Convert to Fastify. This is where hapi gets `request.mime`: https://github.com/hapijs/hapi/blob/b8ba0adc7c3255995cb56a9a740c4f9750b80e6b/lib/route.js#L433
        referrer: (request.raw.headers.referrer || request.raw.headers.referer || '') as string, // TODO: Not sure we need to correctly spelled `referrer`? It's just copied from https://github.com/hapijs/hapi/blob/b8ba0adc7c3255995cb56a9a740c4f9750b80e6b/lib/request.js#L636
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
        responseTime, // custom non-ECS field
      },
    },
    url: {
      path,
      query,
    },
    user_agent: {
      original: request.headers['user-agent'],
    },
    // trace: traceId ? { id: traceId } : undefined,
  };

  return {
    message: `${method} ${pathWithQuery} ${status_code}${responseTimeMsg}${bytesMsg}`,
    meta,
  };
}
