/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type DiagnosticResult } from '@elastic/elasticsearch';
import { redactSensitiveHeaders } from '@kbn/core-http-router-server-internal/src/headers';
import { type LogMeta } from '@kbn/logging';

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
        headers: redactSensitiveHeaders(event.meta.request.params.headers),
      },
      response: {
        body: {
          bytes,
        },
        status_code: event.statusCode,
        // @ts-expect-error ECS custom field: https://github.com/elastic/ecs/issues/232.
        headers: redactSensitiveHeaders(event.headers),
      },
    },
    url: {
      path: event.meta.request.params.path,
      query: event.meta.request.params.querystring,
    },
  };

  return meta;
}
