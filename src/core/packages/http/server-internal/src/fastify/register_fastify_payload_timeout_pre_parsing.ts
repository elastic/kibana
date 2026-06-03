/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Readable } from 'node:stream';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RouterRoute } from '@kbn/core-http-server';

function methodMayHaveBody(method: string): boolean {
  const m = method.toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

function resolvePayloadSource(req: FastifyRequest): Readable | undefined {
  if (!methodMayHaveBody(String(req.method ?? ''))) {
    return undefined;
  }
  const raw = req.raw;
  if (raw !== null && typeof raw === 'object' && typeof (raw as Readable).read === 'function') {
    return raw as Readable;
  }
  return undefined;
}

/**
 * Arms {@link RouterRoute} `options.timeout.payload` on the raw request stream.
 * Must run after {@link populateMatchedRouteFromFindMyWay} populates `req.app.matchedRoute`
 * and before Fastify's content-type parsers buffer the entity body (typically `preParsing`).
 *
 * @internal
 */
export function attachFastifyPayloadReceiveTimeout(req: FastifyRequest, reply: FastifyReply): void {
  const route = (req as { app?: { matchedRoute?: RouterRoute } }).app?.matchedRoute;
  const payloadTimeoutMs = route?.options?.timeout?.payload;

  if (
    payloadTimeoutMs === undefined ||
    payloadTimeoutMs === null ||
    !methodMayHaveBody(String(req.method ?? ''))
  ) {
    return;
  }

  const timeoutError = new Error('Request Timeout');
  const onPayloadTimeout = () => {
    // Hapi aborts the socket during slow uploads; supertest's chunked writer rejects with
    // "socket hang up" rather than resolving an HTTP 408 while bytes are still in flight.
    const source = resolvePayloadSource(req);
    source?.destroy(timeoutError);
    req.raw.destroy(timeoutError);
    const socket = req.raw.socket;
    if (socket && !socket.destroyed) {
      socket.destroy(timeoutError);
    }
  };

  const source = resolvePayloadSource(req);
  if (source === undefined) {
    return;
  }

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
    onPayloadTimeout();
  }, payloadTimeoutMs);

  source.once('error', cleanup);
  if (payloadTimeoutMs > 500) {
    reply.raw.once('finish', cleanup);
  }
}
