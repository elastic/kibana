/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'node:stream';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { RouterRoute } from '@kbn/core-http-server';

/**
 * Hapi `payload.output: 'stream'` routes accept arbitrary `Content-Type` values listed in
 * `options.body.accepts` (e.g. Files upload with `image/png`). Fastify only ships parsers for
 * `application/json` and `text/plain`; anything else would yield {@link FST_ERR_CTP_INVALID_MEDIA_TYPE}
 * (415) before the router runs. Register a catch-all parser **after** `@fastify/multipart` so
 * `multipart/form-data` keeps working, and only synthesize a Readable for routes that declare
 * stream + non-parsed bodies.
 *
 * @internal
 */
export function registerFastifyFallbackStreamBodyParser(fastify: FastifyInstance): void {
  fastify.addContentTypeParser(
    '*',
    { parseAs: 'buffer' },
    (request: FastifyRequest, body: Buffer, done) => {
      const method = String(request.method ?? 'GET').toUpperCase();
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        done(null, undefined);
        return;
      }

      const route = (request as { app?: { matchedRoute?: RouterRoute } }).app?.matchedRoute;
      const bodyOpts = route?.options?.body as { output?: string; parse?: boolean } | undefined;
      if (bodyOpts?.output === 'stream' && bodyOpts.parse !== true) {
        const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
        done(null, Readable.from(buf.length > 0 ? buf : Buffer.alloc(0)));
        return;
      }

      const err = Object.assign(new Error('Unsupported Media Type'), { statusCode: 415 });
      done(err);
    }
  );
}
