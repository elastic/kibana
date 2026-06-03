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
 * Fastify rejects requests that declare `Content-Type: application/json` but send an
 * empty body (`FST_ERR_CTP_EMPTY_JSON_BODY`). Hapi accepted these via `@hapi/subtext`, which
 * returns `null` for an empty `application/json` payload (see `internals.object` in subtext).
 *
 * Install before routes listen; replaces the built-in `application/json` parser with one
 * that treats an empty body as `null` (Hapi parity), delegating otherwise to Fastify's default
 * JSON parser (same proto / constructor poisoning settings as the instance).
 *
 * Uses `parseAs: 'buffer'` (this Fastify build does not allow `parseAs: 'stream'` on JSON).
 * For stream-mode routes we expose `Readable.from(buffer)` so handlers still receive a
 * Node stream (e.g. Console proxy pipes into Elasticsearch) after route lookup populated
 * `request.app.matchedRoute`.
 *
 * @internal
 */
export function installHapiCompatibleJsonBodyParser(fastify: FastifyInstance): void {
  const protoAction = fastify.initialConfig.onProtoPoisoning ?? 'error';
  const constructorAction = fastify.initialConfig.onConstructorPoisoning ?? 'error';
  const defaultJsonParser = fastify.getDefaultJsonParser(protoAction, constructorAction);

  fastify.removeContentTypeParser('application/json');
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    function kibanaLenientJsonParser(request: FastifyRequest, body: Buffer, done) {
      const route = (request as { app?: { matchedRoute?: RouterRoute } }).app?.matchedRoute;
      if (routeHasUnparsedPayload(route)) {
        const buf = body.length > 0 ? body : Buffer.alloc(0);
        done(null, routeWantsStreamPayload(route) ? Readable.from(buf) : buf);
        return;
      }

      const text = body.length === 0 ? '' : body.toString('utf8');
      if (text === '') {
        done(null, null);
        return;
      }
      defaultJsonParser(request, text, done);
    }
  );
}
