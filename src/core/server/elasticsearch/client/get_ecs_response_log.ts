/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { type IncomingHttpHeaders } from 'http';
import { type DiagnosticResult } from '@elastic/elasticsearch';
import { type LogMeta } from '@kbn/logging';

const FORBIDDEN_HEADERS = ['authorization', 'cookie', 'set-cookie'];
const REDACTED_HEADER_TEXT = '[REDACTED]';

// We are excluding sensitive headers by default, until we have a log filtering mechanism.
function redactSensitiveHeaders(key: string, value: string | string[]): string | string[] {
  return FORBIDDEN_HEADERS.includes(key) ? REDACTED_HEADER_TEXT : value;
}

// Shallow clone the headers so they are not mutated if filtered by a RewriteAppender.
function cloneAndFilterHeaders(headers?: IncomingHttpHeaders) {
  const result = {} as IncomingHttpHeaders;
  if (headers) {
    for (const key of Object.keys(headers)) {
      const value = headers[key];
      if (value) {
        result[key] = redactSensitiveHeaders(key, value);
      }
    }
  }
  return result;
}

/**
 * Retruns ECS-compliant `LogMeta` for logging.
 *
 * @internal
 */
export function getEcsResponseLog(event: DiagnosticResult, bytes?: number): LogMeta {
  const meta: LogMeta = {
    http: {
      request: {
        id: event.meta.request.options.opaqueId,
        method: event.meta.request.params.method.toUpperCase(),
        // @ts-expect-error ECS custom field: https://github.com/elastic/ecs/issues/232.
        headers: cloneAndFilterHeaders(event.meta.request.params.headers),
      },
      response: {
        body: {
          bytes,
        },
        status_code: event.statusCode,
        // @ts-expect-error ECS custom field: https://github.com/elastic/ecs/issues/232.
        headers: cloneAndFilterHeaders(event.headers),
      },
    },
    url: {
      path: event.meta.request.params.path,
      query: event.meta.request.params.querystring,
    },
  };

  return meta;
}
