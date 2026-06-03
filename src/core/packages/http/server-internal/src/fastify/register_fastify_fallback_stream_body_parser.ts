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

import { routeHasUnparsedPayload, routeWantsStreamPayload } from './fastify_route_body_options';

/**
 * Hapi `payload.output: 'stream'` routes accept arbitrary `Content-Type` values listed in
 * `options.body.accepts` (e.g. Files upload with `image/png`). Routes with `parse: false` and
 * `output: 'data'` (default when body validation exists, e.g. Fleet package upload with
 * `application/zip`) receive a raw Buffer. Fastify only ships parsers for `application/json`
 * and `text/plain`; anything else would yield {@link FST_ERR_CTP_INVALID_MEDIA_TYPE} (415)
 * before the router runs. Register a catch-all parser **after** `@fastify/multipart` so
 * `multipart/form-data` keeps working.
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
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(body ?? []);
      if (!routeHasUnparsedPayload(route)) {
        // Hapi Subtext uses defaultContentType `application/json`; an empty body still parses to
        // `null` (see installHapiCompatibleJsonBodyParser). Bodyless POSTs without Content-Type
        // hit this catch-all parser and also yield `null`.
        if (buf.length === 0) {
          done(null, null);
          return;
        }
        const err = Object.assign(new Error('Unsupported Media Type'), { statusCode: 415 });
        done(err);
        return;
      }

      const payload = buf.length > 0 ? buf : Buffer.alloc(0);
      done(null, routeWantsStreamPayload(route) ? Readable.from(payload) : payload);
    }
  );
}
