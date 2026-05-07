/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Transform, isReadable, type Readable } from 'node:stream';
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
    (req: FastifyRequest, _reply: FastifyReply, payload: unknown, done) => {
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
      const started = Date.now();
      let finished = false;

      const intervalMs = Math.min(25, Math.max(1, Math.floor(payloadTimeoutMs / 4)));

      const failPayloadTimeout = () => {
        clearInterval(timer);
        if (finished) {
          return;
        }
        finished = true;
        source.destroy();
        // Match Hapi/subtext: abort the request without a full HTTP response so clients
        // (supertest / FTR) surface `Request Timeout` rather than a 408 body.
        req.raw.destroy();
      };

      const timer = setInterval(() => {
        if (finished) {
          clearInterval(timer);
          return;
        }
        if (Date.now() - started > payloadTimeoutMs) {
          failPayloadTimeout();
        }
      }, intervalMs);

      const guard = new Transform({
        transform(chunk, _enc, callback) {
          if (finished) {
            callback();
            return;
          }
          if (Date.now() - started > payloadTimeoutMs) {
            callback(new Error('Payload timeout'));
            return;
          }
          callback(null, chunk);
        },
      });

      const cleanup = () => {
        clearInterval(timer);
        if (finished) {
          return;
        }
        finished = true;
      };

      source.once('end', cleanup);
      source.once('close', cleanup);
      source.once('error', cleanup);

      guard.once('error', () => {
        cleanup();
        failPayloadTimeout();
      });

      source.pipe(guard);
      done(null, guard);
    }
  );
}
