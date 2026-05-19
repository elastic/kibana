/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as parseQueryString } from 'node:querystring';
import { Readable } from 'node:stream';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { RouterRoute } from '@kbn/core-http-server';

import { routeHasUnparsedPayload, routeWantsStreamPayload } from './fastify_route_body_options';

/** Matches `application/x-www-form-urlencoded` with optional `; charset=…`. */
const URLENCODED_CONTENT_TYPE = /^application\/x-www-form-urlencoded(?:\s*;|$)/i;

/**
 * Hapi parses `application/x-www-form-urlencoded` into `request.payload` for routes with
 * body validation (e.g. Security SAML `/api/security/saml/callback`). Fastify only ships
 * JSON/text parsers; without this, the catch-all parser in
 * {@link registerFastifyFallbackStreamBodyParser} returns 415 for normal form posts.
 *
 * @internal
 */
export function installHapiCompatibleUrlEncodedBodyParser(fastify: FastifyInstance): void {
  fastify.addContentTypeParser(
    URLENCODED_CONTENT_TYPE,
    { parseAs: 'buffer' },
    function kibanaUrlEncodedParser(request: FastifyRequest, body: Buffer, done) {
      const route = (request as { app?: { matchedRoute?: RouterRoute } }).app?.matchedRoute;
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);

      if (routeHasUnparsedPayload(route)) {
        const payload = buf.length > 0 ? buf : Buffer.alloc(0);
        done(null, routeWantsStreamPayload(route) ? Readable.from(payload) : payload);
        return;
      }

      const text = buf.length === 0 ? '' : buf.toString('utf8');
      if (text === '') {
        done(null, {});
        return;
      }

      try {
        done(null, parseQueryString(text));
      } catch (err) {
        done(err as Error);
      }
    }
  );
}
