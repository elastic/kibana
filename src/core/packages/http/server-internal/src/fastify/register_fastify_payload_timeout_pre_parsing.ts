/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isReadable, type Readable } from 'node:stream';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { RouterRoute } from '@kbn/core-http-server';

function methodMayHaveBody(method: string): boolean {
  const m = method.toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

function isPayloadStream(payload: unknown): payload is Readable {
  if (payload === null || typeof payload !== 'object') {
    return false;
  }
  return Boolean(isReadable(payload as Readable));
}

/**
 * Enforces {@link RouterRoute} `options.timeout.payload` while the raw body is still streaming,
 * matching Hapi `routes.payload.timeout` + per-route payload timeout semantics.
 *
 * Must run in `preParsing` **after** the route-lookup hook has populated `req.app.matchedRoute`.
 *
 * @internal
 */
export function registerFastifyPayloadTimeoutPreParsing(fastify: FastifyInstance): void {
  fastify.addHook(
    'preParsing',
    (req: FastifyRequest, reply: FastifyReply, payload: unknown, done) => {
      const route = (req as { app?: { matchedRoute?: RouterRoute } }).app?.matchedRoute;
      const payloadTimeoutMs = route?.options?.timeout?.payload;

      if (
        payloadTimeoutMs === undefined ||
        payloadTimeoutMs === null ||
        !methodMayHaveBody(String(req.method ?? ''))
      ) {
        done();
        return;
      }

      if (!isPayloadStream(payload)) {
        done();
        return;
      }

      const source = payload;
      let finished = false;
      const cleanup = () => {
        clearTimeout(timer);
        finished = true;
      };
      const timer = setTimeout(() => {
        if (finished) {
          return;
        }
        finished = true;
        // Send 408 before closing to preserve the same supertest error semantics as Hapi.
        if (!reply.raw.headersSent && !reply.sent) {
          reply.raw.statusCode = 408;
          reply.raw.statusMessage = 'Request Timeout';
          reply.raw.setHeader('connection', 'close');
          reply.raw.end('Request Timeout');
        }
        source.destroy(new Error('Request Timeout'));
        req.raw.destroy(new Error('Request Timeout'));
      }, payloadTimeoutMs);

      source.once('end', cleanup);
      source.once('close', cleanup);
      source.once('error', cleanup);
      done(null, source);
    }
  );
}
