/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isReadable, type Readable } from 'node:stream';
import type { FastifyReply, FastifyRequest } from 'fastify';
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

function resolvePayloadSource(payload: unknown, req: FastifyRequest): Readable | undefined {
  if (isPayloadStream(payload)) {
    return payload;
  }
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
 * Arms {@link RouterRoute} `options.timeout.payload` for the current `preParsing` payload stream.
 * Must run in the same `preParsing` hook that populated `req.app.matchedRoute` (before `done(null, payload)`).
 *
 * @internal
 */
export function attachFastifyPayloadReceiveTimeout(
  req: FastifyRequest,
  reply: FastifyReply,
  payload: unknown
): void {
  const route = (req as { app?: { matchedRoute?: RouterRoute } }).app?.matchedRoute;
  const payloadTimeoutMs = route?.options?.timeout?.payload;

  if (
    payloadTimeoutMs === undefined ||
    payloadTimeoutMs === null ||
    !methodMayHaveBody(String(req.method ?? ''))
  ) {
    return;
  }

  const source = resolvePayloadSource(payload, req);
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
    if (!reply.raw.headersSent && !reply.sent) {
      reply.raw.statusCode = 408;
      reply.raw.statusMessage = 'Request Timeout';
      reply.raw.setHeader('connection', 'close');
      reply.raw.end('Request Timeout');
    }
    source.destroy(new Error('Request Timeout'));
    req.raw.destroy(new Error('Request Timeout'));
  }, payloadTimeoutMs);

  source.once('error', cleanup);
  if (payloadTimeoutMs > 500) {
    reply.raw.once('finish', cleanup);
  }
}
